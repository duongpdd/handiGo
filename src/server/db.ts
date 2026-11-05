import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, scryptSync } from "node:crypto";
import catalog from "../../data/catalog.json";
import type { Product, Variant } from "@/lib/shop";

// Vercel chỉ cho ghi vào thư mục tạm, nên dữ liệu ở đó sẽ mất khi máy chủ khởi động lại.
const defaultDb = process.env.VERCEL ? join(tmpdir(), "handigo.sqlite") : ".runtime/handigo.sqlite";
const file = resolve(/* turbopackIgnore: true */ process.env.HANDIGO_DB || defaultDb);
mkdirSync(dirname(file), { recursive: true });
export const db = new DatabaseSync(file);
db.exec(`
  PRAGMA busy_timeout = 5000;
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS products (
    slug TEXT PRIMARY KEY, detail TEXT NOT NULL, price INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS variants (
    id TEXT PRIMARY KEY, product_slug TEXT NOT NULL REFERENCES products(slug),
    name TEXT NOT NULL, hex TEXT NOT NULL, image TEXT NOT NULL,
    stock INTEGER NOT NULL CHECK(stock >= 0)
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    password TEXT NOT NULL, role TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS checkout_addresses (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), label TEXT NOT NULL,
    name TEXT NOT NULL, phone TEXT NOT NULL, province TEXT NOT NULL, ward TEXT NOT NULL,
    street TEXT NOT NULL, is_default INTEGER NOT NULL CHECK(is_default IN (0, 1))
  );
  CREATE INDEX IF NOT EXISTS checkout_addresses_user ON checkout_addresses(user_id);
  CREATE UNIQUE INDEX IF NOT EXISTS checkout_addresses_default ON checkout_addresses(user_id) WHERE is_default = 1;
  CREATE TABLE IF NOT EXISTS cart_items (
    user_id TEXT NOT NULL REFERENCES users(id), variant_id TEXT NOT NULL REFERENCES variants(id),
    quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99), updated_at INTEGER NOT NULL,
    PRIMARY KEY(user_id, variant_id)
  );
  CREATE TABLE IF NOT EXISTS orders (
    code TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL,
    user_id TEXT REFERENCES users(id), name TEXT NOT NULL, phone TEXT NOT NULL,
    address TEXT NOT NULL, note TEXT NOT NULL, subtotal INTEGER NOT NULL,
    shipping INTEGER NOT NULL, total INTEGER NOT NULL, status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS order_items (
    code TEXT NOT NULL REFERENCES orders(code), variant_id TEXT NOT NULL REFERENCES variants(id),
    product_name TEXT NOT NULL, variant_name TEXT NOT NULL, unit_price INTEGER NOT NULL,
    quantity INTEGER NOT NULL, PRIMARY KEY(code, variant_id)
  );
  CREATE TABLE IF NOT EXISTS order_reviews (
    code TEXT PRIMARY KEY REFERENCES orders(code),
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL
  );
`);

export function transaction<T>(operation: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = operation();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function passwordHash(password: string, salt = randomBytes(16).toString("hex")) {
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}

transaction(() => {
  const addProduct = db.prepare("INSERT OR IGNORE INTO products(slug, detail, price) VALUES (?, ?, ?)");
  const addVariant = db.prepare("INSERT OR IGNORE INTO variants VALUES (?, ?, ?, ?, ?, ?)");
  const storedGallery = db.prepare("SELECT json_extract(detail, '$.images') AS images FROM products WHERE slug = ?");
  const updateGallery = db.prepare("UPDATE products SET detail = json_set(detail, '$.images', json(?)) WHERE slug = ?");
  for (const { variants, ...product } of catalog) {
    const inserted = addProduct.run(product.slug, JSON.stringify(product), product.price);
    if (inserted.changes === 0) {
      const current = JSON.parse(String(storedGallery.get(product.slug)?.images ?? "[]")) as string[];
      const additions = product.images.filter((image) => !current.includes(image));
      if (additions.length) updateGallery.run(JSON.stringify([...current, ...additions]), product.slug);
    }
    for (const variant of variants) {
      addVariant.run(variant.id, product.slug, variant.name, variant.hex, variant.image, variant.stock);
    }
  }
  const email = process.env.HANDIGO_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.HANDIGO_ADMIN_PASSWORD;
  if (email && password && password.length >= 12) {
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (!existing) {
      db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, 'admin')")
        .run(randomBytes(16).toString("hex"), email, "Quản trị HandiGo", passwordHash(password));
    }
  }
});

export function listProducts(includeInactive = false): Product[] {
  const rows = db.prepare("SELECT detail, price, active FROM products WHERE active = 1 OR ? ORDER BY rowid")
    .all(Number(includeInactive));
  const variants = db.prepare("SELECT id, name, hex, image, stock FROM variants WHERE product_slug = ? ORDER BY rowid");
  return rows.map((row) => {
    const product = JSON.parse(String(row.detail)) as Product;
    const colors = (variants.all(product.slug) as Variant[]).map((variant) => ({ ...variant }));
    return { ...product, price: Number(row.price), active: Boolean(row.active), variants: colors };
  });
}

const configuredFee = Number(process.env.HANDIGO_SHIPPING_FEE ?? 25000);
export const shippingFee = Number.isSafeInteger(configuredFee) && configuredFee >= 0 && configuredFee <= 1_000_000
  ? configuredFee
  : 25000;

import { AsyncLocalStorage } from "node:async_hooks";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { createClient, type InStatement, type InValue, type ResultSet, type Transaction, type Value } from "@libsql/client";
import catalog from "../../data/catalog.json";
import type { Product, Variant } from "@/lib/shop";

export type Row = Record<string, Value>;

const remoteUrl = process.env.TURSO_DATABASE_URL?.trim();

// Mỗi instance của Vercel có thư mục tạm riêng và bị xóa khi tắt, nên trên Vercel phải dùng Turso.
// Thiếu cấu hình thì trang vẫn xem được, còn đăng ký và đăng nhập bị chặn thay vì báo thành công giả.
export const persistentDb = Boolean(remoteUrl) || !process.env.VERCEL;

function localUrl() {
  const file = resolve(/* turbopackIgnore: true */ process.env.HANDIGO_DB
    || (process.env.VERCEL ? join(tmpdir(), "handigo.sqlite") : ".runtime/handigo.sqlite"));
  mkdirSync(dirname(file), { recursive: true });
  return "file:" + relative(process.cwd(), file).replaceAll("\\", "/");
}

const client = createClient(remoteUrl
  // Dùng HTTP vì kết nối WebSocket không bền qua các lần đánh thức của serverless.
  ? { url: remoteUrl.replace(/^libsql:\/\//, "https://"), authToken: process.env.TURSO_AUTH_TOKEN?.trim() }
  : { url: localUrl(), timeout: 5000 });

const schema = `
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
`;

let ready: Promise<void> | undefined;
const ensureReady = () => ready ??= initialize().catch((error) => {
  ready = undefined;
  throw error;
});

async function initialize() {
  if (!remoteUrl) await client.execute("PRAGMA journal_mode = WAL");
  await client.executeMultiple(schema);
  const stored = await client.execute("SELECT slug, json_extract(detail, '$.images') AS images FROM products");
  const galleries = new Map(stored.rows.map((row) => [String(row.slug), JSON.parse(String(row.images ?? "[]")) as string[]]));
  const seed: InStatement[] = [];
  for (const { variants, ...product } of catalog) {
    const current = galleries.get(product.slug);
    if (!current) {
      seed.push({ sql: "INSERT OR IGNORE INTO products(slug, detail, price) VALUES (?, ?, ?)", args: [product.slug, JSON.stringify(product), product.price] });
    } else {
      const additions = product.images.filter((image) => !current.includes(image));
      if (additions.length) {
        seed.push({ sql: "UPDATE products SET detail = json_set(detail, '$.images', json(?)) WHERE slug = ?", args: [JSON.stringify([...current, ...additions]), product.slug] });
      }
    }
    for (const variant of variants) {
      seed.push({ sql: "INSERT OR IGNORE INTO variants VALUES (?, ?, ?, ?, ?, ?)", args: [variant.id, product.slug, variant.name, variant.hex, variant.image, variant.stock] });
    }
  }
  await client.batch(seed, "write");
  const email = process.env.HANDIGO_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.HANDIGO_ADMIN_PASSWORD;
  if (email && password && password.length >= 12) {
    const existing = await client.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] });
    if (!existing.rows.length) {
      await client.execute({
        sql: "INSERT OR IGNORE INTO users VALUES (?, ?, ?, ?, 'admin')",
        args: [randomBytes(16).toString("hex"), email, "Quản trị HandiGo", passwordHash(password)],
      });
    }
  }
}

// Câu lệnh chạy trong transaction() tự dùng transaction đó, kể cả khi gọi qua hàm khác như listCart.
const activeTransaction = new AsyncLocalStorage<Transaction>();

const toRows = ({ columns, rows }: ResultSet): Row[] =>
  rows.map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index]])));

export const db = {
  prepare(sql: string) {
    const execute = async (args: InValue[]) => {
      await ensureReady();
      return (activeTransaction.getStore() ?? client).execute({ sql, args });
    };
    return {
      get: async (...args: InValue[]): Promise<Row | undefined> => toRows(await execute(args))[0],
      all: async (...args: InValue[]) => toRows(await execute(args)),
      run: async (...args: InValue[]) => ({ changes: (await execute(args)).rowsAffected }),
    };
  },
};

export async function transaction<T>(operation: () => Promise<T>): Promise<T> {
  await ensureReady();
  const active = await client.transaction("write");
  try {
    const result = await activeTransaction.run(active, operation);
    await active.commit();
    return result;
  } catch (error) {
    await active.rollback().catch(() => {});
    throw error;
  } finally {
    active.close();
  }
}

export function passwordHash(password: string, salt = randomBytes(16).toString("hex")) {
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}

export async function listProducts(includeInactive = false): Promise<Product[]> {
  const rows = await db.prepare("SELECT detail, price, active FROM products WHERE active = 1 OR ? ORDER BY rowid")
    .all(Number(includeInactive));
  const variants = await db.prepare("SELECT id, name, hex, image, stock, product_slug FROM variants ORDER BY rowid").all();
  return rows.map((row) => {
    const product = JSON.parse(String(row.detail)) as Product;
    const colors = variants.filter((variant) => variant.product_slug === product.slug)
      .map(({ product_slug: _slug, ...variant }) => variant as unknown as Variant);
    return { ...product, price: Number(row.price), active: Boolean(row.active), variants: colors };
  });
}

const configuredFee = Number(process.env.HANDIGO_SHIPPING_FEE ?? 25000);
export const shippingFee = Number.isSafeInteger(configuredFee) && configuredFee >= 0 && configuredFee <= 1_000_000
  ? configuredFee
  : 25000;

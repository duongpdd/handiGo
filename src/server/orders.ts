import { createHash, randomBytes } from "node:crypto";
import type { SQLOutputValue } from "node:sqlite";
import type { Account, Order, OrderStatus } from "@/lib/shop";
import { transitions } from "@/lib/shop";
import { checkoutTotals, type CheckoutAddress } from "@/lib/checkout";
import { checkoutShippingFee } from "@/lib/checkout-shipping";
import { fail, field } from "./auth";
import { checkoutPricing, getCheckoutVoucher, normalizeVoucher } from "./checkout";
import { db, transaction } from "./db";

const lookupPhone = (value: unknown) => {
  const phone = field(value, "Số điện thoại", 9, 20).replace(/[ .-]/g, "").replace(/^\+84/, "0");
  if (!/^0\d{9}$/.test(phone)) fail("Nhập số điện thoại Việt Nam gồm 10 chữ số.");
  return phone;
};

function readOrder(row: Record<string, SQLOutputValue>): Order {
  const items = db.prepare(`
    SELECT variant_id AS variantId, product_name AS productName, variant_name AS variantName,
           unit_price AS unitPrice, quantity FROM order_items WHERE code = ? ORDER BY rowid
  `).all(String(row.code)).map((item) => ({ ...item })) as Order["items"];
  return {
    code: String(row.code), name: String(row.name), phone: String(row.phone),
    address: String(row.address), note: String(row.note), subtotal: Number(row.subtotal),
    shipping: Number(row.shipping), total: Number(row.total),
    status: row.status as OrderStatus, createdAt: String(row.created_at), items,
    ...(typeof row.rating === "number" ? { review: { rating: row.rating, comment: String(row.comment) } } : {}),
  };
}

export function listOrders(account: Account, includeAll = false) {
  const rows = includeAll && account.role === "admin"
    ? db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all()
    : db.prepare(`
      SELECT o.*, r.rating, r.comment FROM orders o
      LEFT JOIN order_reviews r ON r.code = o.code
      WHERE o.user_id = ? ORDER BY o.created_at DESC
    `).all(account.id);
  return rows.map(readOrder);
}

export function listSoldQuantities(): Record<string, number> {
  const rows = db.prepare(`
    SELECT v.product_slug AS slug, SUM(i.quantity) AS sold
    FROM orders o
    JOIN order_items i ON i.code = o.code
    JOIN variants v ON v.id = i.variant_id
    WHERE o.status = 'delivered'
    GROUP BY v.product_slug
  `).all();
  return Object.fromEntries(rows.map(({ slug, sold }) => [String(slug), Number(sold)]));
}

export function lookupOrder(body: Record<string, unknown>) {
  const code = field(body.code, "Mã đơn", 17, 17).toUpperCase();
  const row = db.prepare("SELECT * FROM orders WHERE code = ? AND phone = ?").get(code, lookupPhone(body.phone));
  if (!row) fail("Không tìm thấy đơn với mã và số điện thoại này.", 404);
  const { code: orderCode, status, createdAt, total, items } = readOrder(row);
  return { code: orderCode, status, createdAt, total, items };
}

export function checkoutAddress(account: Account): CheckoutAddress | null {
  const row = db.prepare("SELECT name, phone, address FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(account.id);
  return row ? { name: String(row.name), phone: String(row.phone), address: String(row.address) } : null;
}

export function checkoutOrder(account: Account, code: string) {
  const row = db.prepare("SELECT * FROM orders WHERE user_id = ? AND code = ?").get(account.id, code);
  return row ? readOrder(row) : null;
}

export function placeOrder(body: Record<string, unknown>, account: Account | null) {
  const name = field(body.name, "Họ tên", 2, 80);
  const phone = lookupPhone(body.phone);
  const address = field(body.address, "Địa chỉ nhận hàng", 8, 250);
  const note = field(body.note, "Ghi chú", 0, 500);
  const requestId = field(body.requestId, "Mã yêu cầu", 36, 36);
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) fail("Mã yêu cầu không hợp lệ.");
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 50) fail("Giỏ hàng chưa có sản phẩm.");
  const quantities = new Map<string, number>();
  for (const item of body.items) {
    if (!item || typeof item !== "object") fail("Sản phẩm không hợp lệ.");
    const id = field(item.variantId, "Mã biến thể", 2, 50);
    const quantity = (quantities.get(id) ?? 0) + Number(item.quantity);
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || quantity > 99) fail("Số lượng không hợp lệ.");
    quantities.set(id, quantity);
  }
  const lines = [...quantities].sort(([left], [right]) => left.localeCompare(right));
  const voucher = normalizeVoucher(body.voucher);
  const shippingVoucher = normalizeVoucher(body.shippingVoucher);
  const signature = [account?.id, name, phone, address, note, lines, ...(voucher ? [voucher] : []),
    ...(shippingVoucher ? [{ shippingVoucher }] : [])];
  const hash = createHash("sha256").update(JSON.stringify(signature)).digest("hex");
  return transaction(() => {
    const previous = db.prepare("SELECT * FROM orders WHERE request_id = ?").get(requestId);
    if (previous) {
      if (previous.request_hash !== hash) fail("Yêu cầu này đã dùng cho đơn khác.", 409);
      return readOrder(previous);
    }
    if (shippingVoucher) fail("Voucher vận chuyển đã ngừng áp dụng.");
    const select = db.prepare(`
      SELECT v.name AS color, v.stock, p.detail, p.price FROM variants v
      JOIN products p ON p.slug = v.product_slug WHERE v.id = ? AND p.active = 1
    `);
    const items = lines.map(([variantId, quantity]) => {
      const row = select.get(variantId);
      if (!row) fail("Có sản phẩm đã ngừng bán. Vui lòng kiểm tra giỏ.", 409);
      const { sku, name: productName } = JSON.parse(String(row.detail)) as { sku: string; name: string };
      if (Number(row.stock) < quantity) fail(productName + " không đủ hàng cho màu đã chọn.", 409);
      return { variantId, quantity, sku, productName, color: String(row.color), unitPrice: Number(row.price) };
    });
    const selected = voucher ? getCheckoutVoucher(voucher) : undefined;
    const shipping = checkoutShippingFee(checkoutPricing, address, items.reduce((sum, item) => sum + item.quantity, 0));
    const { subtotal, total, reason } = checkoutTotals(items, shipping, selected);
    if (reason) fail(reason, 409);
    if (body.expectedTotal !== total) fail("Tổng thanh toán đã thay đổi. Tải lại trang để kiểm tra giá và ưu đãi.", 409);
    const code = "HG-" + randomBytes(7).toString("hex").toUpperCase();
    db.prepare(`
      INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(code, requestId, hash, account?.id ?? null, name, phone, address, note, subtotal,
      shipping, total, new Date().toISOString());
    const add = db.prepare("INSERT INTO order_items VALUES (?, ?, ?, ?, ?, ?)");
    const reserve = db.prepare("UPDATE variants SET stock = stock - ? WHERE id = ?");
    for (const item of items) {
      add.run(code, item.variantId, item.productName, item.color, item.unitPrice, item.quantity);
      reserve.run(item.quantity, item.variantId);
    }
    if (account) {
      // Bỏ phần đã đặt khỏi giỏ của tài khoản. Xóa dòng trước, rồi mới trừ số lượng còn dư.
      const drop = db.prepare("DELETE FROM cart_items WHERE user_id = ? AND variant_id = ? AND quantity <= ?");
      const take = db.prepare("UPDATE cart_items SET quantity = quantity - ? WHERE user_id = ? AND variant_id = ? AND quantity > ?");
      for (const item of items) {
        drop.run(account.id, item.variantId, item.quantity);
        take.run(item.quantity, account.id, item.variantId, item.quantity);
      }
    }
    return readOrder(db.prepare("SELECT * FROM orders WHERE code = ?").get(code)!);
  });
}

export function changeOrderStatus(body: Record<string, unknown>, customer?: Account) {
  const code = field(body.code, "Mã đơn", 17, 17);
  const status = customer ? "cancelled" : field(body.status, "Trạng thái", 1, 20) as OrderStatus;
  return transaction(() => {
    const row = customer
      ? db.prepare("SELECT * FROM orders WHERE code = ? AND user_id = ?").get(code, customer.id)
      : db.prepare("SELECT * FROM orders WHERE code = ?").get(code);
    if (!row) fail("Không tìm thấy đơn.", 404);
    const order = readOrder(row);
    if (order.status === status) return order;
    if (customer && order.status !== "pending") fail("Chỉ có thể hủy đơn đang chờ xác nhận.", 409);
    if (!transitions[order.status].includes(status)) fail("Không thể chuyển đơn sang trạng thái này.", 409);
    db.prepare("UPDATE orders SET status = ? WHERE code = ?").run(status, code);
    if (status === "cancelled") {
      const restock = db.prepare("UPDATE variants SET stock = stock + ? WHERE id = ?");
      for (const item of order.items) restock.run(item.quantity, item.variantId);
    }
    return { ...order, status };
  });
}

export function reviewOrder(body: Record<string, unknown>, account: Account) {
  const code = field(body.code, "Mã đơn", 17, 17);
  const rating = body.rating;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    fail("Chọn mức đánh giá từ 1 đến 5 sao.");
  }
  const comment = field(body.comment, "Nội dung đánh giá", 0, 500);
  return transaction(() => {
    const row = db.prepare("SELECT status FROM orders WHERE code = ? AND user_id = ?").get(code, account.id);
    if (!row) fail("Không tìm thấy đơn.", 404);
    if (row.status !== "delivered") fail("Chỉ có thể đánh giá đơn đã giao.", 409);
    db.prepare("INSERT OR IGNORE INTO order_reviews VALUES (?, ?, ?)").run(code, rating, comment);
    const saved = db.prepare("SELECT rating, comment FROM order_reviews WHERE code = ?").get(code)!;
    return { rating: Number(saved.rating), comment: String(saved.comment) };
  });
}

export function updateProduct(body: Record<string, unknown>) {
  const slug = field(body.slug, "Mã sản phẩm", 1, 80);
  const price = Number(body.price);
  if (!Number.isSafeInteger(price) || price < 1 || price > 100_000_000) fail("Giá không hợp lệ.");
  if (typeof body.active !== "boolean" || !Array.isArray(body.variants)) fail("Dữ liệu sản phẩm không hợp lệ.");
  const variants = body.variants;
  transaction(() => {
    const product = db.prepare("SELECT detail, price, active FROM products WHERE slug = ?").get(slug);
    if (!product) fail("Không tìm thấy sản phẩm.", 404);
    if (product.price !== body.previousPrice || Boolean(product.active) !== body.previousActive) {
      fail("Sản phẩm đã được cập nhật. Tải lại trang trước khi lưu.", 409);
    }
    const { images } = JSON.parse(String(product.detail)) as { images: string[] };
    const rows = db.prepare("SELECT id, stock, image FROM variants WHERE product_slug = ?").all(slug);
    if (variants.length !== rows.length || new Set(variants.map((variant) => variant?.id)).size !== rows.length) {
      fail("Danh sách màu không hợp lệ.");
    }
    const update = db.prepare("UPDATE variants SET stock = ?, image = ? WHERE id = ?");
    for (const variant of variants) {
      const current = rows.find((row) => row.id === variant?.id);
      if (!current || !Number.isSafeInteger(variant.stock) || variant.stock < 0 || variant.stock > 100_000 || !images.includes(variant.image)) {
        fail("Tồn kho hoặc ảnh màu không hợp lệ.");
      }
      const stockChanged = variant.stock !== variant.previousStock;
      if (stockChanged && current.stock !== variant.previousStock) {
        fail("Tồn kho đã thay đổi. Tải lại trang trước khi chỉnh tồn.", 409);
      }
      const imageChanged = variant.image !== variant.previousImage;
      if (imageChanged && current.image !== variant.previousImage) {
        fail("Ảnh màu đã thay đổi. Tải lại trang trước khi lưu.", 409);
      }
      update.run(stockChanged ? variant.stock : current.stock, imageChanged ? variant.image : current.image, variant.id);
    }
    db.prepare("UPDATE products SET price = ?, active = ? WHERE slug = ?").run(price, Number(body.active), slug);
  });
}

import type { Account, CartLine } from "@/lib/shop";
import { fail, field } from "./auth";
import { db, transaction } from "./db";

const maxQuantity = 99;
const maxLines = 50;

/** Giỏ hàng của tài khoản, theo thứ tự thêm vào. */
export async function listCart(account: Account): Promise<CartLine[]> {
  const rows = await db.prepare("SELECT variant_id, quantity FROM cart_items WHERE user_id = ? ORDER BY rowid")
    .all(account.id);
  return rows.map((row) => ({ variantId: String(row.variant_id), quantity: Number(row.quantity) }));
}

function readLines(value: unknown): CartLine[] {
  if (!Array.isArray(value) || !value.length || value.length > maxLines) fail("Giỏ hàng không hợp lệ.");
  return value.map((item) => {
    if (!item || typeof item !== "object") fail("Sản phẩm không hợp lệ.");
    const line = item as Record<string, unknown>;
    const variantId = field(line.variantId, "Mã biến thể", 2, 50);
    const quantity = line.quantity;
    if (typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity < 0 || quantity > maxQuantity) {
      fail("Số lượng không hợp lệ.");
    }
    return { variantId, quantity };
  });
}

/**
 * Thao tác trên giỏ hàng lưu ở máy chủ:
 * - `list`: đọc giỏ hiện tại.
 * - `add`: cộng thêm số lượng; báo lỗi nếu vượt tồn kho (dùng cho Thêm vào giỏ, Mua ngay, Mua lại).
 * - `set`: đặt đúng số lượng; 0 là xóa dòng.
 * - `merge`: gộp giỏ cũ từ trình duyệt, tự bỏ qua hàng ngừng bán và cắt theo tồn kho.
 */
export async function updateCart(account: Account, body: Record<string, unknown>): Promise<CartLine[]> {
  const operation = body.operation;
  if (operation === "list") return listCart(account);
  if (operation !== "add" && operation !== "set" && operation !== "merge") fail("Thao tác giỏ hàng không hợp lệ.");
  const lines = readLines(body.items);
  return transaction(async () => {
    const variant = db.prepare(`
      SELECT v.stock, p.detail FROM variants v JOIN products p ON p.slug = v.product_slug
      WHERE v.id = ? AND p.active = 1
    `);
    const current = db.prepare("SELECT quantity FROM cart_items WHERE user_id = ? AND variant_id = ?");
    const save = db.prepare(`
      INSERT INTO cart_items (user_id, variant_id, quantity, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, variant_id) DO UPDATE SET quantity = excluded.quantity, updated_at = excluded.updated_at
    `);
    const remove = db.prepare("DELETE FROM cart_items WHERE user_id = ? AND variant_id = ?");
    const now = Date.now();
    for (const { variantId, quantity } of lines) {
      const existing = Number((await current.get(account.id, variantId))?.quantity ?? 0);
      if (operation === "set" && quantity === 0) {
        await remove.run(account.id, variantId);
        continue;
      }
      const row = await variant.get(variantId);
      if (operation === "merge") {
        if (!row) continue;
        const total = Math.min(existing + quantity, Number(row.stock), maxQuantity);
        if (total > existing) await save.run(account.id, variantId, total, now);
        continue;
      }
      if (!row) fail("Có sản phẩm đã ngừng bán. Vui lòng kiểm tra giỏ.", 409);
      const { name } = JSON.parse(String(row.detail)) as { name: string };
      const limit = Math.min(Number(row.stock), maxQuantity);
      if (operation === "add") {
        if (quantity < 1) fail("Số lượng không hợp lệ.");
        if (existing + quantity > limit) fail(name + " không đủ hàng cho màu đã chọn.", 409);
        await save.run(account.id, variantId, existing + quantity, now);
      } else {
        // Cho phép giảm khi tồn kho vừa bị giảm; chỉ chặn khi tăng vượt tồn.
        if (quantity > existing && quantity > limit) fail("Số lượng vượt quá tồn kho.", 409);
        await save.run(account.id, variantId, quantity, now);
      }
    }
    return listCart(account);
  });
}

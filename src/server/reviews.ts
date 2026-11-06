import type { ProductRating, ProductReview } from "@/lib/shop";
import { db } from "./db";

// Mỗi đánh giá gắn với một đơn đã giao; đơn có nhiều sản phẩm thì đánh giá tính cho từng sản phẩm trong đơn.
const reviewedProducts = `
  SELECT DISTINCT i.code, v.product_slug AS slug
  FROM order_items i JOIN variants v ON v.id = i.variant_id
`;

export async function listProductRatings(): Promise<Record<string, ProductRating>> {
  const rows = await db.prepare(`
    SELECT p.slug, AVG(r.rating) AS average, COUNT(*) AS count
    FROM order_reviews r JOIN (${reviewedProducts}) p ON p.code = r.code
    GROUP BY p.slug
  `).all();
  return Object.fromEntries(rows.map((row) => [String(row.slug), {
    average: Math.round(Number(row.average) * 10) / 10,
    count: Number(row.count),
  }]));
}

/** Che tên người nhận theo kiểu "N***h" để hiển thị công khai. */
function maskName(name: string) {
  const letters = Array.from(name.trim());
  if (!letters.length) return "Khách***";
  return letters[0] + "***" + (letters.length > 1 ? letters.at(-1) : "");
}

export async function listProductReviews(slug: string | undefined, limit = 10): Promise<ProductReview[]> {
  if (!slug) return [];
  const rows = await db.prepare(`
    SELECT o.name, r.rating, r.comment, GROUP_CONCAT(i.variant_name, ', ') AS variants
    FROM order_reviews r
    JOIN orders o ON o.code = r.code
    JOIN order_items i ON i.code = r.code
    JOIN variants v ON v.id = i.variant_id
    WHERE v.product_slug = ?
    GROUP BY r.code
    ORDER BY o.created_at DESC
    LIMIT ?
  `).all(slug, limit);
  return rows.map((row) => ({
    reviewer: maskName(String(row.name)),
    rating: Number(row.rating),
    comment: String(row.comment),
    variants: String(row.variants ?? ""),
  }));
}

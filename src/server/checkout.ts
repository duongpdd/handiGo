import { fail } from "./auth";
import { shippingFee } from "./db";
import type { CheckoutPricing, CheckoutVoucher } from "@/lib/checkout";
import { shippingProvince } from "@/lib/checkout-shipping";

function amount(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 100_000_000 ? parsed : fallback;
}

export const checkoutPricing: CheckoutPricing = {
  originProvince: shippingProvince(process.env.HANDIGO_SHIPPING_ORIGIN ?? "") ?? "Hà Nội",
  gramsPerItem: amount(process.env.HANDIGO_SHIPPING_GRAMS_PER_ITEM, 500) || 500,
  fallbackShippingFee: shippingFee || 25_000,
};

// Cột VOUCHER của tab "Đề thi ND1" trong bảng DBC–MAGIC. Tab không có mã nên HandiGo đặt tên theo mức giảm; MC570 không có voucher.
export const checkoutVouchers: CheckoutVoucher[] = [
  { code: "HANDIGO20", amount: 20_000, minimum: 0, productSkus: ["B-02PRO", "B-26", "A-028", "A-014", "MC500", "MC870", "MC1200", "MPI480"] },
  { code: "HANDIGO40", amount: 40_000, minimum: 0, productSkus: ["MC650"] },
];

export function normalizeVoucher(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export function getCheckoutVoucher(code: string) {
  const voucher = checkoutVouchers.find((item) => item.code === code);
  if (!voucher) fail("Mã giảm giá không hợp lệ.");
  return voucher;
}

export function deliveryEstimate(now: Date) {
  const format = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
  return format.formatRange(new Date(now.getTime() + 2 * 86_400_000), new Date(now.getTime() + 4 * 86_400_000));
}

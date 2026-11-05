export type CheckoutAddress = { name: string; phone: string; address: string };
export type AddressBookEntry = CheckoutAddress & {
  id: string; label: string; province: string; ward: string; street: string; isDefault: boolean;
};

export const addressTypes = { VP: "Văn phòng", NR: "Nhà riêng" } as const;
type AddressType = keyof typeof addressTypes;

export function isAddressType(value: unknown): value is AddressType {
  return value === "VP" || value === "NR";
}

export function savedAddressType(label: string): AddressType | undefined {
  if (isAddressType(label)) return label;
  const name = label.trim().toLocaleLowerCase("vi");
  if (name === "văn phòng") return "VP";
  if (name === "nhà" || name === "nhà riêng") return "NR";
}

export type { CheckoutPricing } from "./checkout-shipping";
export type CheckoutVoucher = { code: string; amount: number; minimum: number; productSkus?: string[] };
export type CheckoutVoucherLine = { sku: string; unitPrice: number; quantity: number };

const number = new Intl.NumberFormat("vi-VN");
export const checkoutMoney = (value: number) => number.format(value) + "đ";

export function checkoutTotals(lines: CheckoutVoucherLine[], shipping: number, voucher?: CheckoutVoucher) {
  let subtotal = 0;
  let eligibleSubtotal = 0;
  for (const { sku, unitPrice, quantity } of lines) {
    const lineTotal = unitPrice * quantity;
    subtotal += lineTotal;
    if (!voucher?.productSkus || voucher.productSkus.includes(sku)) eligibleSubtotal += lineTotal;
  }
  let reason = "";
  if (voucher?.productSkus && !eligibleSubtotal) {
    reason = "Giỏ hàng chưa có sản phẩm áp dụng mã này.";
  } else if (voucher && eligibleSubtotal < voucher.minimum) {
    reason = "Mua thêm " + checkoutMoney(voucher.minimum - eligibleSubtotal) + " để dùng mã.";
  }
  const discount = voucher && !reason ? Math.min(eligibleSubtotal, voucher.amount) : 0;
  return { subtotal, discount, total: subtotal + shipping - discount, reason };
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import {
  checkoutMoney as money, checkoutTotals, type AddressBookEntry, type CheckoutAddress, type CheckoutPricing, type CheckoutVoucher,
} from "@/lib/checkout";
import { checkoutShippingFee } from "@/lib/checkout-shipping";
import type { CartLine, Order } from "@/lib/shop";
import { CheckoutAddressCard, useCheckoutAddress } from "./checkout-address";
import { CheckoutVouchers } from "./checkout-vouchers";
import { EmptyCart, errorMessage, post, type ResolvedLine } from "./order-flow";
import { Icon } from "./storefront-controls";

function CheckoutHeading({ complete = false }: { complete?: boolean }) {
  return <div className="checkout-heading">
    <h1>{complete ? "Cảm ơn bạn đã đặt hàng" : "Thanh toán"}</h1>
    <nav aria-label="Tiến trình đặt hàng">
      <ol>
        <li><Link href="/gio-hang">Giỏ hàng</Link></li>
        <li aria-current={complete ? undefined : "step"}>Đặt hàng</li>
        <li aria-current={complete ? "step" : undefined}>Hoàn tất</li>
      </ol>
    </nav>
  </div>;
}

export function CheckoutComplete({ order }: { order: Order }) {
  return <>
    <CheckoutHeading complete />
    <section className="checkout-card checkout-complete" aria-labelledby="checkout-complete-title">
      <span className="success-icon"><Icon name="check" size={24} /></span>
      <h2 id="checkout-complete-title">Đặt hàng thành công</h2>
      <p>Mã đơn hàng <strong>{order.code}</strong></p>
      <p>Thanh toán khi nhận hàng <strong>{money(order.total)}</strong></p>
      <div className="checkout-complete-actions">
        <Link className="button" href="/tai-khoan">Xem đơn hàng</Link>
        <Link className="button secondary" href="/shopping">Tiếp tục mua sắm</Link>
      </div>
    </section>
  </>;
}

export function Checkout({ lines, pricing, estimate, note, setNote, accountName, addresses, fallbackAddress, vouchers, adjust, clear }: {
  lines: ResolvedLine[];
  pricing: CheckoutPricing;
  estimate: string;
  note: string;
  setNote: (note: string) => void;
  accountName: string;
  addresses: AddressBookEntry[];
  fallbackAddress: CheckoutAddress | null;
  vouchers: CheckoutVoucher[];
  adjust: (id: string, quantity: number) => void;
  clear: (items: CartLine[]) => void;
}) {
  const router = useRouter();
  const address = useCheckoutAddress(addresses, fallbackAddress, accountName, lines.length > 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedVoucher, setSelectedVoucher] = useState<CheckoutVoucher>();
  const locked = useRef(false);
  const submission = useRef<{ signature: string; id: string } | null>(null);
  const voucherLines = lines.map(({ product, quantity }) => ({ sku: product.sku, unitPrice: product.price, quantity }));
  const quantity = lines.reduce((sum, item) => sum + item.quantity, 0);
  const destination = address.editing ? address.fields.province : address.recipient?.address;
  const shipping = destination ? checkoutShippingFee(pricing, destination, quantity) : undefined;
  const hasShipping = shipping !== undefined;
  const { subtotal, discount, total } = checkoutTotals(voucherLines, shipping ?? 0, selectedVoucher);
  const stockIssue = lines.some((line) => line.quantity > line.variant.stock);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || address.saving || stockIssue || !lines.length) return;
    locked.current = true;
    const recipient = await address.commit();
    if (!recipient) {
      locked.current = false;
      return;
    }
    const confirmed = checkoutTotals(voucherLines, checkoutShippingFee(pricing, recipient.address, quantity), selectedVoucher);
    const payload = {
      ...recipient,
      note,
      voucher: confirmed.discount ? selectedVoucher?.code : undefined,
      items: lines.map((line) => ({ variantId: line.variant.id, quantity: line.quantity })),
      expectedTotal: confirmed.total,
    };
    const signature = JSON.stringify(payload);
    if (submission.current?.signature !== signature) submission.current = { signature, id: crypto.randomUUID() };
    setBusy(true);
    setError("");
    let order: Order;
    try {
      ({ order } = await post<{ order: Order }>("order", { ...payload, requestId: submission.current.id }));
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
      locked.current = false;
      return;
    }
    router.replace("/thanh-toan/hoan-tat?don=" + encodeURIComponent(order.code));
    clear(payload.items);
  }

  return <>
    <CheckoutHeading />
    {!lines.length && !busy ? <EmptyCart /> : <form onSubmit={submit} noValidate>
      <fieldset className="checkout-stack" disabled={busy}>
        <CheckoutAddressCard editor={address} />

        <section className="checkout-card" aria-labelledby="checkout-products">
          <h2 id="checkout-products">Sản phẩm</h2>
          <div className="checkout-line-labels" aria-hidden="true">
            <span>Sản phẩm</span><span>Đơn giá</span><span>Số lượng</span><span>Thành tiền</span>
          </div>
          {lines.map(({ product, variant, quantity }) => <article className="checkout-line" key={variant.id}>
            <div className="checkout-line-product">
              <img src={variant.image || product.images[0]} alt="" width={64} height={64} />
              <div><Link href={`/san-pham/${product.slug}?mau=${variant.id}`}>{product.name}</Link>
                <p>Màu {variant.name}</p></div>
            </div>
            <div className="checkout-unit-price"><span className="checkout-mobile-label">Đơn giá</span><strong>{money(product.price)}</strong>
              {product.listPrice > product.price && <del>{money(product.listPrice)}</del>}</div>
            <div className="checkout-quantity">
              <div className="stepper" aria-label={`Số lượng ${product.name}, màu ${variant.name}`}>
                <button type="button" aria-label={`Giảm ${product.name}, màu ${variant.name}`}
                  disabled={quantity <= 1} onClick={() => adjust(variant.id, quantity - 1)}>−</button>
                <span>{quantity}</span>
                <button type="button" aria-label={`Tăng ${product.name}, màu ${variant.name}`}
                  disabled={quantity >= Math.min(variant.stock, 99)} onClick={() => adjust(variant.id, quantity + 1)}>+</button>
              </div>
            </div>
            <div className="checkout-line-total"><span className="checkout-mobile-label">Thành tiền</span><strong>{money(product.price * quantity)}</strong></div>
            {quantity > variant.stock && <p className="checkout-error checkout-stock">Còn {variant.stock} sản phẩm màu này. <Link href="/gio-hang">Sửa giỏ hàng</Link></p>}
          </article>)}
        </section>

        <section className="checkout-card" aria-labelledby="checkout-shipping-title">
          <h2 id="checkout-shipping-title">Vận chuyển</h2>
          <div className="checkout-shipping"><strong>Phí vận chuyển</strong>
            <strong>{hasShipping ? money(shipping) : "Chờ địa chỉ"}</strong></div>
          <p className="checkout-muted">{hasShipping ? "Dự kiến giao từ " + estimate : "Chọn tỉnh hoặc thành phố nhận hàng để tính cước."}</p>
        </section>

        <CheckoutVouchers options={vouchers} selected={selectedVoucher} change={setSelectedVoucher} lines={voucherLines} />

        <section className="checkout-card">
          <h2><label htmlFor="checkout-note">Lời nhắn cho cửa hàng</label></h2>
          <input id="checkout-note" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)}
            placeholder="Ví dụ: Giao trong giờ hành chính (không bắt buộc)" />
        </section>

        <section className="checkout-card" aria-labelledby="checkout-payment">
          <h2 id="checkout-payment">Phương thức thanh toán</h2>
          <div className="checkout-payment" role="radiogroup" aria-labelledby="checkout-payment">
            <label><input type="radio" name="payment" value="cod" defaultChecked /> Thanh toán khi nhận hàng (COD)</label>
            <label className="checkout-payment-disabled"><input type="radio" name="payment" value="qr" disabled /> Chuyển khoản QR <span>Sắp có</span></label>
          </div>
        </section>

        <section className="checkout-card">
          <h2>Chi tiết thanh toán</h2>
          <dl className="checkout-breakdown">
            <div><dt>Tổng tiền hàng</dt><dd>{money(subtotal)}</dd></div>
            <div><dt>Phí vận chuyển</dt><dd>{hasShipping ? money(shipping) : "Chờ địa chỉ"}</dd></div>
            <div><dt>Giảm giá đơn hàng</dt><dd>{discount ? "−" : ""}{money(discount)}</dd></div>
            <div className="checkout-grand"><dt>{hasShipping ? "Tổng thanh toán" : "Tạm tính"}</dt><dd>{money(total)}</dd></div>
          </dl>
        </section>

        <section className="checkout-card checkout-final">
          <p className="checkout-muted">Bằng cách đặt hàng, bạn đồng ý với <Link href="/chinh-sach/giao-hang">chính sách giao hàng</Link> và <Link href="/chinh-sach/doi-tra">đổi trả</Link> của HandiGo.</p>
          {error && <p className="checkout-error" role="alert">{error}</p>}
          <div className="checkout-submit-bar">
            <div className="checkout-mobile-total"><span>{hasShipping ? "Tổng thanh toán" : "Tạm tính"}</span><strong>{money(total)}</strong></div>
            <button className="button" type="submit" disabled={busy || address.saving || stockIssue}>
              {busy ? <><span className="button-spinner" aria-hidden="true" />Đang xử lý…</> : "Đặt hàng"}
            </button>
          </div>
        </section>
      </fieldset>
    </form>}
  </>;
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import type { AddressBookEntry } from "@/lib/checkout";
import { orderStatuses, type Account, type Order, type OrderReview, type OrderStatus, type Product, type Variant } from "@/lib/shop";
import { CheckoutAddressCard, useCheckoutAddress } from "./checkout-address";
import { errorMessage, post } from "./order-flow";
import { Icon, normalizeSearch } from "./storefront-controls";

const statuses = [["all", "Tất cả"], ...Object.entries(orderStatuses) as [OrderStatus, string][]] as const;
const timeZone = "Asia/Ho_Chi_Minh";
const orderDate = new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeZone });
const orderTime = new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone, hourCycle: "h23" });
const priceFormat = new Intl.NumberFormat("vi-VN");
const formatPrice = (value: number) => priceFormat.format(value) + "đ";
const shortCode = (code: string) => code.slice(-8);
const milestones = [
  ["pending", "Đặt hàng"], ["confirmed", "Xác nhận"], ["shipping", "Giao hàng"], ["delivered", "Hoàn tất"],
] as const;

type ProductImages = Map<string, { product: Product; variant: Variant }>;

function PurchaseItems({ items, products }: { items: Order["items"]; products: ProductImages }) {
  return <ul className="account-order-items">
    {items.map((item) => {
      const entry = products.get(item.variantId);
      const image = entry?.variant.image || entry?.product.images[0];
      return <li key={item.variantId} className="account-order-item">
        <div className="account-order-photo">
          {image ? <img src={image} alt="" width={72} height={72} loading="lazy" /> : <Icon name="box" />}
        </div>
        <div className="account-order-product">
          {entry?.product.active ? <Link href={`/san-pham/${entry.product.slug}?mau=${entry.variant.id}`}>{item.productName}</Link>
            : <strong>{item.productName}</strong>}
          <p>Màu {item.variantName}</p>
        </div>
        <strong className="account-order-price">{formatPrice(item.unitPrice)} × {item.quantity}</strong>
      </li>;
    })}
  </ul>;
}

function PurchaseDetails({ order, products, id }: { order: Order; products: ProductImages; id: string }) {
  const stage = milestones.findIndex(([status]) => status === order.status);
  const savings = order.subtotal + order.shipping - order.total;

  return <section id={id} className="account-order-details" aria-label="Chi tiết đơn hàng">
    {order.status === "cancelled"
      ? <p className="account-order-status" data-status="cancelled">Đơn hàng đã hủy</p>
      : <ol className="account-order-timeline" aria-label="Tiến trình đơn hàng">
        {milestones.map(([status, label], index) => <li key={status}
          data-reached={index <= stage} aria-current={index === stage ? "step" : undefined}>{label}</li>)}
      </ol>}
    <div>
      <h3>Địa chỉ nhận hàng</h3>
      <p><strong>{order.name}</strong> · {order.phone}</p>
      <p>{order.address}</p>
      {order.note && <p>Ghi chú · {order.note}</p>}
    </div>
    <div>
      <h3>Sản phẩm</h3>
      <PurchaseItems items={order.items} products={products} />
    </div>
    <div>
      <h3>Chi tiết thanh toán</h3>
      <dl>
        <div><dt>Tiền hàng</dt><dd>{formatPrice(order.subtotal)}</dd></div>
        <div><dt>Phí vận chuyển</dt><dd>{formatPrice(order.shipping)}</dd></div>
        <div><dt>Giảm giá</dt><dd>{savings > 0 ? "−" : ""}{formatPrice(savings)}</dd></div>
        <div><dt>Tổng thanh toán</dt><dd>{formatPrice(order.total)}</dd></div>
      </dl>
      <p className="muted">Thanh toán khi nhận hàng</p>
    </div>
  </section>;
}

function PurchaseCard({ order, products, reorder, announce }: {
  order: Order; products: ProductImages; reorder: (items: Order["items"]) => Promise<void>; announce: (message: string) => void;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [copied, setCopied] = useState(false);
  const [review, setReview] = useState(order.review);
  const [rating, setRating] = useState(0);
  const cancelDialog = useRef<HTMLDialogElement>(null);
  const reviewDialog = useRef<HTMLDialogElement>(null);
  const requestPending = useRef(false);
  const date = new Date(order.createdAt);
  const displayCode = shortCode(order.code);
  const detailsId = "order-details-" + order.code;
  const itemsId = "order-items-" + order.code;

  async function copyCode() {
    setError("");
    try {
      await navigator.clipboard.writeText(order.code);
      setCopied(true);
      announce("Đã sao chép mã đơn đầy đủ.");
    } catch {
      setError("Chưa sao chép được. Mã đơn đầy đủ là " + order.code + ".");
    }
  }

  async function submitAction(action: "cancel-order" | "review-order", data: object = {}) {
    if (requestPending.current) return;
    requestPending.current = true;
    setBusy(true);
    setDialogError("");
    try {
      if (action === "cancel-order") {
        await post(action, { code: order.code });
        cancelDialog.current?.close();
        announce("Đã hủy đơn " + displayCode + ".");
        router.refresh();
      } else {
        const result = await post<{ review: OrderReview }>(action, { code: order.code, ...data });
        setReview(result.review);
        reviewDialog.current?.close();
        announce("Đã lưu đánh giá của bạn.");
      }
    } catch (failure) {
      setDialogError(errorMessage(failure));
    } finally {
      requestPending.current = false;
      setBusy(false);
    }
  }

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitAction("review-order", { rating, comment: new FormData(event.currentTarget).get("comment") });
  }

  async function buyAgain() {
    setReordering(true);
    setError("");
    try {
      await reorder(order.items);
    } catch (failure) {
      setError(errorMessage(failure));
      setReordering(false);
    }
  }

  const canReorder = order.status === "delivered" || order.status === "cancelled";
  return <article className="account-order" aria-label={"Đơn hàng " + displayCode}>
    <header className="account-order-head">
      <div className="account-order-code">
        <strong title={order.code}>Mã đơn: {displayCode}</strong>
        <button className="account-icon-button" type="button" title="Sao chép mã đơn đầy đủ" aria-label="Sao chép mã đơn đầy đủ"
          onClick={() => void copyCode()}><Icon name={copied ? "check" : "copy"} size={17} /></button>
      </div>
      <span className="account-order-status" data-status={order.status}>{orderStatuses[order.status]}</span>
    </header>
    <div id={itemsId}><PurchaseItems items={showItems ? order.items : order.items.slice(0, 1)} products={products} /></div>
    {order.items.length > 1 && <button className="account-order-more" type="button" aria-expanded={showItems} aria-controls={itemsId}
      onClick={() => setShowItems(!showItems)}>
      {showItems ? "Thu gọn sản phẩm" : `Xem thêm ${order.items.length - 1} sản phẩm`} <Icon name="chevron" size={16} />
    </button>}
    <div className="account-order-footer">
      <time dateTime={order.createdAt}>Đặt lúc {orderTime.format(date)}, {orderDate.format(date)}</time>
      <p>Thành tiền <strong>{formatPrice(order.total)}</strong></p>
      <div className="account-order-actions">
        {order.status === "pending" && <button type="button" className="button secondary" onClick={() => {
          setDialogError("");
          cancelDialog.current?.showModal();
        }}>Hủy đơn</button>}
        {(order.status === "confirmed" || order.status === "shipping") &&
          <Link className="button secondary" href="/lien-he">Hỗ trợ</Link>}
        {order.status === "delivered" && <button type="button" className={review ? "button secondary" : "button"}
          onClick={() => { setDialogError(""); reviewDialog.current?.showModal(); }}>
          {review ? "Xem đánh giá" : "Đánh giá"}
        </button>}
        {canReorder && <button type="button" className={order.status === "cancelled" || review ? "button" : "button secondary"}
          disabled={reordering} onClick={() => void buyAgain()}>{reordering ? "Đang thêm…" : "Mua lại"}</button>}
        <button type="button" className={canReorder ? "button secondary" : "button"} aria-expanded={expanded}
          aria-controls={expanded ? detailsId : undefined}
          onClick={() => setExpanded(!expanded)}>{expanded ? "Ẩn chi tiết" : "Xem chi tiết"}</button>
      </div>
      {error && <p className="account-action-error" role="alert">{error}</p>}
    </div>
    {expanded && <PurchaseDetails order={order} products={products} id={detailsId} />}
    {order.status === "pending" && <dialog ref={cancelDialog} className="account-dialog" aria-labelledby={detailsId + "-cancel"}
      onCancel={(event) => { if (busy) event.preventDefault(); }}>
      <h2 id={detailsId + "-cancel"}>Hủy đơn hàng?</h2>
      <p>Bạn có chắc muốn hủy đơn {displayCode}?</p>
      {dialogError && <p className="account-action-error" role="alert">{dialogError}</p>}
      <div className="account-order-actions">
        <button type="button" className="button secondary" autoFocus disabled={busy}
          onClick={() => cancelDialog.current?.close()}>Giữ đơn</button>
        <button type="button" className="button" disabled={busy}
          onClick={() => void submitAction("cancel-order")}>{busy ? "Đang hủy…" : "Xác nhận hủy"}</button>
      </div>
    </dialog>}
    {order.status === "delivered" && <dialog ref={reviewDialog} className="account-dialog" aria-labelledby={detailsId + "-review"}
      onCancel={(event) => { if (busy) event.preventDefault(); }}>
      <h2 id={detailsId + "-review"}>Đánh giá đơn hàng</h2>
      {review ? <>
        <p><strong>{review.rating}/5 sao</strong></p>
        {review.comment && <p>{review.comment}</p>}
        <div className="account-order-actions"><button type="button" className="button"
          onClick={() => reviewDialog.current?.close()}>Đóng</button></div>
      </> : <form onSubmit={submitReview}>
        <fieldset className="account-rating" disabled={busy}>
          <legend>Mức hài lòng</legend>
          <div>{[1, 2, 3, 4, 5].map((value) => <label key={value} data-filled={value <= rating}>
            <input type="radio" name="rating" value={value} aria-label={value + " sao"} checked={value === rating} required
              onChange={() => setRating(value)} />
            <span aria-hidden="true">{value <= rating ? "★" : "☆"}</span>
          </label>)}</div>
        </fieldset>
        <label className="field">Nhận xét (không bắt buộc)
          <textarea name="comment" maxLength={500} rows={3} disabled={busy} />
        </label>
        {dialogError && <p className="account-action-error" role="alert">{dialogError}</p>}
        <div className="account-order-actions">
          <button type="button" className="button secondary" disabled={busy} onClick={() => reviewDialog.current?.close()}>Đóng</button>
          <button className="button" disabled={busy || !rating}>{busy ? "Đang lưu…" : "Gửi đánh giá"}</button>
        </div>
      </form>}
    </dialog>}
  </article>;
}

export function AccountPage({ account, orders, products, addresses, logout, reorder }: {
  account: Account; orders: Order[]; products: Product[]; addresses: AddressBookEntry[];
  logout: () => Promise<void>; reorder: (items: Order["items"]) => Promise<void>;
}) {
  const [view, setView] = useState<"orders" | "profile" | "addresses">("orders");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const addressEditor = useCheckoutAddress(addresses, null, account.name, view === "addresses");
  const nameParts = account.name.trim().split(/\s+/);
  const initials = [nameParts[0], ...(nameParts.length > 1 ? nameParts.slice(-1) : [])]
    .map((part) => Array.from(part)[0]).join("").toLocaleUpperCase("vi");
  const search = normalizeSearch(query);
  const productImages: ProductImages = new Map(products.flatMap((product) =>
    product.variants.map((variant) => [variant.id, { product, variant }] as const)));
  const counts = { all: orders.length, pending: 0, confirmed: 0, shipping: 0, delivered: 0, cancelled: 0 };
  for (const order of orders) counts[order.status]++;
  const visibleOrders = orders.filter((order) => {
    if (status !== "all" && order.status !== status) return false;
    return !search || normalizeSearch(order.code).replaceAll(" ", "").includes(search.replaceAll(" ", "")) ||
      order.items.some((item) => normalizeSearch(item.productName + " " + item.variantName).includes(search));
  });

  return <div className="account-dashboard">
    <aside className="account-sidebar">
      <div className="account-identity">
        <span className="account-avatar" aria-hidden="true">{initials}</span>
        <div><strong>{account.name}</strong><span>{account.email}</span></div>
      </div>
      <nav aria-label="Tài khoản HandiGo">
        <button type="button" aria-current={view === "orders" ? "page" : undefined}
          onClick={() => setView("orders")}><Icon name="receipt" size={18} /> Đơn mua</button>
        <button type="button" aria-current={view === "profile" ? "page" : undefined}
          onClick={() => setView("profile")}><Icon name="user" size={18} /> Hồ sơ</button>
        <button type="button" aria-current={view === "addresses" ? "page" : undefined}
          onClick={() => setView("addresses")}><Icon name="pin" size={18} /> Sổ địa chỉ</button>
        <Link href="/tra-cuu-don"><Icon name="search" size={18} /> Tra cứu đơn</Link>
        <Link href="/lien-he"><Icon name="headset" size={18} /> Hỗ trợ</Link>
        {account.role === "admin" && <Link href="/quan-tri/don-hang"><Icon name="shield" size={18} /> Vào quản trị</Link>}
        <button type="button" onClick={() => void logout()}><Icon name="logout" size={18} /> Đăng xuất</button>
      </nav>
    </aside>
    <div className="account-main">
      <p className="account-announcement" role="status">{announcement}</p>
      {view === "profile" ? <section className="account-profile">
        <p className="eyebrow">Tài khoản HandiGo</p><h1>Hồ sơ của tôi</h1>
        <dl><div><dt>Họ và tên</dt><dd>{account.name}</dd></div><div><dt>Email</dt><dd>{account.email}</dd></div></dl>
      </section> : view === "addresses" ? <>
        <header className="account-orders-title"><p className="eyebrow">Tài khoản HandiGo</p><h1>Sổ địa chỉ</h1></header>
        <CheckoutAddressCard editor={addressEditor} book />
      </> : <>
        <header className="account-orders-title"><p className="eyebrow">Tài khoản HandiGo</p><h1>Đơn mua</h1></header>
        <div className="account-order-filters">
          <div className="account-order-statuses" role="group" aria-label="Lọc trạng thái đơn hàng">
            {statuses.map(([value, label]) => <button type="button" aria-pressed={status === value} data-status={value} key={value}
              onClick={() => setStatus(value)}>{label}{counts[value] > 0 && <span>{counts[value]}</span>}</button>)}
          </div>
          <div className="account-order-search">
            <Icon name="search" size={19} />
            <input ref={searchInput} type="search" aria-label="Tìm đơn hàng" placeholder="Tìm theo mã đơn hoặc tên sản phẩm"
              value={query} onChange={(event) => setQuery(event.target.value)} />
            {query && <button className="account-icon-button" type="button" aria-label="Xóa tìm kiếm"
              onClick={() => { setQuery(""); searchInput.current?.focus(); }}><Icon name="close" size={18} /></button>}
          </div>
        </div>
        <div className="account-order-list">
          {visibleOrders.map((order) => <PurchaseCard key={order.code} order={order} products={productImages}
            reorder={reorder} announce={setAnnouncement} />)}
          {!visibleOrders.length && <section className="account-empty">
            <span><Icon name="box" size={40} /></span>
            <h2>{counts[status] ? "Không tìm thấy đơn hàng" : "Chưa có đơn hàng nào"}</h2>
            <Link className="button" href="/shopping">Tiếp tục mua sắm <Icon name="arrow" size={17} /></Link>
          </section>}
        </div>
      </>}
    </div>
  </div>;
}

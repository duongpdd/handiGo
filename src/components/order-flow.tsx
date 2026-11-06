"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { money, orderStatuses, transitions, type Account, type Order, type OrderStatus, type Product, type Variant } from "@/lib/shop";
import { Icon } from "./storefront-controls";

export async function post<T = { ok: boolean }>(action: string, data: object, signal?: AbortSignal): Promise<T> {
  const response = await fetch("/api/shop/" + action, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), signal,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Yêu cầu thất bại. Vui lòng thử lại.");
  return result;
}

export const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Vui lòng thử lại.";

export function PageTitle({ tag, title, children }: { tag?: string; title: string; children?: ReactNode }) {
  return <div className="page-title">{tag && <p className="eyebrow">{tag}</p>}<h1>{title}</h1>{children}</div>;
}

export type ResolvedLine = { product: Product; variant: Variant; quantity: number };

export function CartPage({ lines, note, setNote, adjust, missing }: {
  lines: ResolvedLine[]; note: string; setNote: (note: string) => void;
  adjust: (id: string, quantity: number) => void; missing: number;
}) {
  const subtotal = lines.reduce((total, line) => total + line.product.price * line.quantity, 0);
  return <>
    <PageTitle tag="Mua sắm" title="Giỏ hàng của bạn" />
    {missing > 0 && <p className="alert">Một số sản phẩm đã ngừng bán và được bỏ khỏi giỏ.</p>}
    {!lines.length ? <EmptyCart /> : <div className="split">
      <section className="panel">
        {lines.map(({ product, variant, quantity }) => <article className="cart-line" key={variant.id}>
          <Link href={"/san-pham/" + product.slug + "?mau=" + variant.id}><img src={variant.image} alt={product.name} /></Link>
          <div><Link className="product-name" href={"/san-pham/" + product.slug}>{product.name}</Link>
            <p className="muted">{variant.name} · {money(product.price)}</p>
            <div className="stepper">
              <button aria-label={"Giảm " + product.name} disabled={quantity <= 1} onClick={() => adjust(variant.id, quantity - 1)}>−</button>
              <span>{quantity}</span>
              <button aria-label={"Tăng " + product.name} disabled={quantity >= Math.min(variant.stock, 99)} onClick={() => adjust(variant.id, quantity + 1)}>+</button>
            </div>
            {quantity > variant.stock && <p className="alert">Còn {variant.stock} sản phẩm.</p>}
          </div>
          <div className="line-total"><strong>{money(quantity * product.price)}</strong>
            <button className="plain" onClick={() => adjust(variant.id, 0)}>Xóa</button></div>
        </article>)}
        <label className="field note">Ghi chú đơn hàng<textarea maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ví dụ: Giao trong giờ hành chính" /></label>
      </section>
      <aside className="panel totals">
        <h2>Thông tin đặt hàng</h2>
        <div><span>Tạm tính</span><strong>{money(subtotal)}</strong></div>
        <p className="muted">Phí giao hàng hiển thị ở bước thanh toán.</p>
        {lines.every((line) => line.quantity <= line.variant.stock) && <Link className="button purchase" href="/thanh-toan">Tiến hành đặt hàng <Icon name="arrow" size={18} /></Link>}
        <Link className="text-link" href="/shopping">← Tiếp tục mua sắm</Link>
      </aside>
    </div>}
  </>;
}

export function EmptyCart() {
  return <div className="panel empty"><h2>Giỏ hàng đang trống</h2><p>Chọn một món tiện ích để bắt đầu.</p><Link className="button" href="/shopping">Khám phá cửa hàng</Link></div>;
}

type PublicOrder = Pick<Order, "code" | "status" | "createdAt" | "total" | "items">;

function OrderSummary({ order }: { order: PublicOrder }) {
  return <div className="order-summary">
    <div className="order-head"><strong>{order.code}</strong><span className="badge">{orderStatuses[order.status]}</span></div>
    <p className="muted">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(order.createdAt))}</p>
    <ul>{order.items.map((item) => <li key={item.variantId}>{item.productName} · {item.variantName} × {item.quantity}</li>)}</ul>
    <p><b>Tổng cộng {money(order.total)}</b></p>
  </div>;
}

export function Lookup() {
  const [order, setOrder] = useState<PublicOrder>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setOrder(undefined);
    try {
      const result = await post<{ order: PublicOrder }>("lookup", Object.fromEntries(new FormData(event.currentTarget)));
      setOrder(result.order);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return <><PageTitle tag="Hỗ trợ" title="Tra cứu đơn hàng" />
    <form className="panel form-stack narrow" onSubmit={submit}>
      <label className="field">Mã đơn hàng<input name="code" required maxLength={17} placeholder="HG-…" /></label>
      <label className="field">Số điện thoại đặt hàng<input name="phone" type="tel" autoComplete="tel" required /></label>
      <button className="button" disabled={busy}>{busy ? "Đang tra cứu…" : "Tra cứu đơn"}</button>
      {error && <p className="alert" role="alert">{error}</p>}
      {order && <OrderSummary order={order} />}
    </form>
  </>;
}

export function AuthForm({ register, account }: { register: boolean; account: Account | null }) {
  const query = useSearchParams();
  const next = query.get("next");
  const destination = next && /^\/(?:shopping|gio-hang|thanh-toan|san-pham\/[a-z0-9-]+)?(?:\?[^\\\s]*)?$/.test(next)
    ? next : "/tai-khoan";
  const fromCart = query.get("them") === "1";
  const authQuery = new URLSearchParams();
  if (destination !== "/tai-khoan") authQuery.set("next", destination);
  if (fromCart) authQuery.set("them", "1");
  const suffix = authQuery.size ? "?" + authQuery : "";
  const title = register ? "Đăng ký" : "Đăng nhập";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await post(register ? "register" : "login", Object.fromEntries(new FormData(event.currentTarget)));
      window.location.replace(destination);
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
    }
  }

  return <div className="auth">
    <div className="auth-content">
      <div className="auth-form">
        <h1>{title}</h1>
        {account ? <Link className="button auth-submit" href={destination}>{destination === "/tai-khoan" ? "Đi đến tài khoản" : "Tiếp tục mua sắm"}</Link> :
          <form className="form-stack" onSubmit={submit}>
            {fromCart && <p className="auth-hint">Đăng nhập để thêm sản phẩm vào giỏ. Sản phẩm bạn vừa chọn sẽ tự vào giỏ ngay sau khi đăng nhập.</p>}
            {register && <label className="field">Họ và tên
              <input name="name" autoComplete="name" placeholder="Nhập họ và tên" required minLength={2} maxLength={80} />
            </label>}
            <label className="field">Email
              <span className="auth-input"><Icon name="user" size={17} />
                <input type="email" name="email" autoComplete="username" placeholder="Nhập email" required maxLength={150} />
              </span>
            </label>
            <div className="field">
              <label htmlFor="auth-password">Mật khẩu</label>
              <div className="auth-input">
                <Icon name="lock" size={17} />
                <input id="auth-password" type={showPassword ? "text" : "password"} name="password"
                  autoComplete={register ? "new-password" : "current-password"} placeholder="Nhập mật khẩu" required minLength={8} maxLength={128} />
                <button className="auth-reveal" type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  onClick={() => setShowPassword(!showPassword)}><Icon name={showPassword ? "eyeOff" : "eye"} size={19} /></button>
              </div>
            </div>
            <div className="auth-options">
              <label><input type="checkbox" name="remember" /> Nhớ tôi lần sau</label>
              {!register && <button type="button" aria-expanded={showHelp} aria-controls="auth-help"
                onClick={() => setShowHelp(!showHelp)}>Quên mật khẩu?</button>}
            </div>
            {!register && <p id="auth-help" className="auth-hint" hidden={!showHelp}>
              Hãy <Link href="/lien-he">liên hệ HandiGo</Link> để được hỗ trợ lấy lại quyền truy cập.
            </p>}
            {error && <p role="alert" className="alert">{error}</p>}
            <button className="button auth-submit" disabled={busy}>{busy ? "Đang xử lý…" : register ? "Tạo tài khoản" : title}</button>
            <p className="auth-switch">{register ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
              <Link href={(register ? "/dang-nhap" : "/dang-ky") + suffix}>{register ? "Đăng nhập" : "Đăng ký"}</Link>
            </p>
          </form>}
      </div>
    </div>
    <div className="auth-promo">
      <img src="/images/banners/magic-health-gift.webp" alt="Máy tăm nước và bàn chải điện MAGIC" />
      <div className="auth-promo-copy" lang="vi">
        <p>Quà tặng <strong>Sức khỏe</strong></p>
        <span>Gắn kết bền lâu</span>
      </div>
    </div>
  </div>;
}

export function OrderList({ orders, admin = false }: { orders: Order[]; admin?: boolean }) {
  return <div className="order-list">
    {orders.length ? orders.map((order) => <OrderCard key={order.code} original={order} admin={admin} />) : <div className="panel empty"><p>Chưa có đơn hàng.</p>{!admin && <Link className="button" href="/shopping">Đi mua sắm</Link>}</div>}
  </div>;
}

function OrderCard({ original, admin }: { original: Order; admin: boolean }) {
  const [order, setOrder] = useState(original);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function update(status: OrderStatus) {
    setBusy(true);
    setError("");
    try {
      const result = await post<{ order: Order }>("status", { code: order.code, status });
      setOrder(result.order);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return <article className="panel"><OrderSummary order={order} />
    {admin && <>
      <p>{order.name} · {order.phone}</p><p>{order.address}</p>{order.note && <p>Ghi chú · {order.note}</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="detail-actions">{transitions[order.status].map((status) =>
        <button key={status} className="button secondary" disabled={busy} onClick={() => update(status)}>
          {status === "cancelled" ? "Hủy đơn" : orderStatuses[status]}
        </button>)}</div>
    </>}
  </article>;
}

export function ProductAdmin({ product }: { product: Product }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [baseline, setBaseline] = useState(product);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    const price = Number(fields.get("price"));
    const active = fields.has("active");
    const variants = baseline.variants.map((variant) => ({
      ...variant,
      stock: Number(fields.get(variant.id)),
      image: String(fields.get(variant.id + "-image")),
      previousStock: variant.stock,
      previousImage: variant.image,
    }));
    try {
      await post("product", {
        slug: product.slug, price, active, variants,
        previousPrice: baseline.price, previousActive: baseline.active,
      });
      setBaseline({ ...baseline, price, active, variants });
      setFailed(false);
      setMessage("Đã lưu.");
    } catch (failure) {
      setFailed(true);
      setMessage(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return <form className="panel form-stack" onSubmit={save}>
    <h2>{product.name} <small className="muted">{product.sku}</small></h2>
    <label className="field">Giá bán (đ)<input type="number" name="price" min={1} defaultValue={product.price} required /></label>
    {product.variants.map((variant) => <div key={variant.id} className="stock-fields">
      <label className="field">Tồn · {variant.name}<input type="number" name={variant.id} min={0} max={100000} defaultValue={variant.stock} required /></label>
      <label className="field">Ảnh · {variant.name}<select name={variant.id + "-image"} defaultValue={variant.image}>
        {product.images.map((image, index) => <option key={image} value={image}>Ảnh {index + 1}</option>)}
      </select></label>
    </div>)}
    <label className="check"><input name="active" type="checkbox" defaultChecked={product.active} /> Đang bán</label>
    <button className="button" disabled={busy}>{busy ? "Đang lưu…" : "Lưu sản phẩm"}</button>
    {message && <p className={failed ? "alert" : "saved"} role="status">{message}</p>}
  </form>;
}

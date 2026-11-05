"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent, type ReactNode, type Ref } from "react";
import { categories, money, type Product } from "@/lib/shop";
import type { ResolvedLine } from "./order-flow";

const paths = {
  chevron: <path d="m6 9 6 6 6-6" />,
  search: <><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 4 4" /></>,
  user: <><circle cx="12" cy="8" r="3.3" /><path d="M5 20c0-3.3 2.6-5.5 7-5.5s7 2.2 7 5.5" /></>,
  cart: <><path d="M3 4h2l2.2 10.5h11.2l2.2-7.2H6" /><circle cx="9" cy="19" r="1" /><circle cx="17.5" cy="19" r="1" /></>,
  add: <><path d="M3 4h2l2.2 10.5h11.2l.5-2M7 19h.1m10.9 0h.1M13 7h8m-4-4v8" /><circle cx="8.5" cy="19" r="1" /><circle cx="18" cy="19" r="1" /></>,
  lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v2" /></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  eyeOff: <><path d="m3 3 18 18M10 6.2a11 11 0 0 1 2-.2c6.5 0 10 6 10 6a15 15 0 0 1-3.2 3.4M6 7.7A16 16 0 0 0 2 12s3.5 6 10 6c1.3 0 2.5-.2 3.5-.6" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  pin: <><path d="M19 10c0 5-7 10-7 10s-7-5-7-10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.3" /></>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  box: <><rect x="4" y="6" width="16" height="14" rx="2" /><path d="M4 10h16m-10 4h4" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6m-6 4h6" /></>,
  store: <><path d="M4 11v9h16v-9M3 8l2-4h14l2 4v2a2 2 0 0 1-4 0 2 2 0 0 1-5 0 2 2 0 0 1-5 0 2 2 0 0 1-4 0V8Z" /><path d="M10 20v-5h4v5" /></>,
  logout: <><path d="M11 4H5v16h6m1-8h8m-3-3 3 3-3 3" /></>,
  shield: <><path d="M12 3 20 6v5c0 4.5-3.3 7.8-8 10-4.7-2.2-8-5.5-8-10V6z" /><path d="m8 12 2.5 2.5L16 9" /></>,
  headset: <><path d="M4 13v-2a8 8 0 0 1 16 0v2m0 4c0 2-2 3-5 3h-2" /><rect x="3" y="11" width="4" height="6" rx="1.5" /><rect x="17" y="11" width="4" height="6" rx="1.5" /></>,
} satisfies Record<string, ReactNode>;

export function Icon({ name, size = 21 }: { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function ProductMenu({ label, products, active, onNavigate }: {
  label: string; products: Product[]; active: boolean; onNavigate: () => void;
}) {
  const [openMode, setOpenMode] = useState<"hover" | "toggle" | null>(null);
  const open = openMode !== null;
  const panelId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const groups = categories.map((category) => ({
    ...category,
    products: products.filter((product) => product.active && product.category === category.slug),
  })).filter((group) => group.products.length > 0);

  function navigate() {
    setOpenMode(null);
    onNavigate();
  }

  return <div className="product-menu" onPointerEnter={(event) => {
    if (event.pointerType === "mouse" && matchMedia("(hover: hover)").matches) setOpenMode((current) => current ?? "hover");
  }} onPointerLeave={(event) => {
    if (event.pointerType === "mouse" && !panel.current?.contains(document.activeElement)) setOpenMode(null);
  }} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpenMode(null);
  }} onKeyDown={(event) => {
    if (event.key !== "Escape" || !open) return;
    event.stopPropagation();
    setOpenMode(null);
    toggle.current?.focus();
  }}>
    <div className="product-menu-trigger">
      <Link href="/shopping" onClick={navigate} aria-current={active ? "page" : undefined}>{label}</Link>
      <button type="button" ref={toggle} aria-label="Danh mục sản phẩm" aria-expanded={open}
        aria-controls={panelId} onClick={() => setOpenMode((current) => current === "toggle" ? null : "toggle")}><Icon name="chevron" size={15} /></button>
    </div>
    <div className="product-menu-panel" id={panelId} ref={panel} hidden={!open}>
      <div className="product-menu-grid">
        {groups.map((group) => <div key={group.slug} className="product-menu-group">
          <Link className="product-menu-heading" href={"/shopping?nhom=" + group.slug} onClick={navigate}>{group.name}</Link>
          <ul>{group.products.map((product) => <li key={product.slug}>
            <Link href={"/san-pham/" + product.slug} onClick={navigate}>{product.name}</Link>
          </li>)}</ul>
        </div>)}
      </div>
      <Link className="product-menu-all" href="/shopping" onClick={navigate}>Xem tất cả sản phẩm <Icon name="arrow" size={16} /></Link>
    </div>
  </div>;
}

export const normalizeSearch = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, " ").trim();

export function matchesProduct(product: Product, term: string) {
  const search = normalizeSearch(term);
  const label = normalizeSearch(product.name + " " + product.sku);
  return search.split(" ").every((token) => label.includes(token)) ||
    label.replaceAll(" ", "").includes(search.replaceAll(" ", ""));
}

export function SearchBox({ products, screen, initialTerm, onNavigate }: {
  products: Product[]; screen: string; initialTerm: string; onNavigate: () => void;
}) {
  const router = useRouter();
  const [term, setTerm] = useState(initialTerm);
  const [expanded, setExpanded] = useState(false);
  const results = term.trim() ? products.filter((product) => product.active && matchesProduct(product, term)).slice(0, 4) : [];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = term.trim();
    const url = value ? "/shopping?q=" + encodeURIComponent(value) : "/shopping";
    if (screen === "shopping") window.history.replaceState(null, "", url);
    else router.push(url);
    onNavigate();
  }

  return <div className="search-shell" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false);
  }}>
    <form className="store-search" role="search" onSubmit={submit}>
      <input aria-label="Tìm theo tên hoặc mã sản phẩm" name="q" maxLength={100} autoComplete="off" autoFocus
        placeholder="Tìm sản phẩm, ví dụ MC500..." value={term} onFocus={() => setExpanded(true)}
        onChange={(event) => { setTerm(event.target.value); setExpanded(true); }} />
      <button className="search-submit" aria-label="Tìm kiếm"><Icon name="search" size={20} /></button>
    </form>
    {expanded && <div className="search-suggestions">
      {term.trim() ? <>
        <p className="suggestion-title">{results.length ? "Sản phẩm gợi ý" : "Không tìm thấy sản phẩm"}</p>
        {results.map((product) => <Link className="suggestion-row" key={product.slug} href={"/san-pham/" + product.slug} onNavigate={onNavigate}>
          <img src={product.images[0]} alt="" />
          <span><b>{product.name}</b><small>{product.sku}</small></span>
          <strong>{money(product.price)}</strong>
        </Link>)}
      </> : <>
        <p className="suggestion-title">Khám phá theo danh mục</p>
        <div className="suggestion-categories">{categories.map((category) =>
          <Link className="filter-chip" key={category.slug} href={"/shopping?nhom=" + category.slug} onNavigate={onNavigate}>{category.name}</Link>)}</div>
      </>}
    </div>}
  </div>;
}

export function QuickCart({ dialogRef, lines, adjust }: {
  dialogRef: Ref<HTMLDialogElement>; lines: ResolvedLine[]; adjust: (id: string, quantity: number) => void;
}) {
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  return <dialog className="quick-cart" ref={dialogRef} aria-labelledby="quick-cart-title"
    onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
    <div className="drawer-inner">
      <header className="drawer-header"><div><p className="eyebrow">HandiGo</p><h2 id="quick-cart-title">Giỏ hàng nhanh <span>{count}</span></h2></div>
        <form method="dialog"><button className="close-button" aria-label="Đóng giỏ hàng" autoFocus><Icon name="close" /></button></form>
      </header>
      <div className="drawer-body">
        {lines.length ? lines.map(({ product, variant, quantity }) => <article className="drawer-line" key={variant.id}>
          <img src={variant.image} alt="" />
          <div><b>{product.name}</b><p className="muted">{variant.name} · {money(product.price)}</p>
            <div className="stepper">
              <button aria-label={"Giảm " + product.name + " màu " + variant.name} disabled={quantity <= 1} onClick={() => adjust(variant.id, quantity - 1)}>−</button>
              <span>{quantity}</span>
              <button aria-label={"Tăng " + product.name + " màu " + variant.name} disabled={quantity >= Math.min(variant.stock, 99)} onClick={() => adjust(variant.id, quantity + 1)}>+</button>
            </div>
            {quantity > variant.stock && <p className="alert">Còn {variant.stock} sản phẩm.</p>}
          </div>
          <button className="close-button remove-line" aria-label={"Xóa " + product.name + " màu " + variant.name} onClick={() => adjust(variant.id, 0)}><Icon name="close" size={16} /></button>
        </article>) : <div className="drawer-empty"><span><Icon name="cart" size={34} /></span><h3>Giỏ hàng đang trống</h3><p>Thêm sản phẩm bạn thích để bắt đầu mua sắm.</p></div>}
      </div>
      <footer className="drawer-footer">
        {lines.length > 0 && <div><span>Tạm tính</span><strong aria-live="polite">{money(subtotal)}</strong></div>}
        <Link className="button" href={lines.length ? "/gio-hang" : "/shopping"}
          onClick={(event) => event.currentTarget.closest("dialog")?.close()}>
          {lines.length ? "Xem giỏ hàng" : "Tiếp tục mua sắm"} <Icon name="arrow" size={18} />
        </Link>
      </footer>
    </div>
  </dialog>;
}

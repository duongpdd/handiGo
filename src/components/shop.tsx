"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  categories, discount, money, type Account, type CartLine, type Order, type Product, type ProductRating, type ProductReview,
} from "@/lib/shop";
import type { AddressBookEntry, CheckoutAddress, CheckoutPricing, CheckoutVoucher } from "@/lib/checkout";
import { AccountPage } from "./account";
import { Hero, HomeShowcase, ProductCard, ProductDetail, type AddToCart } from "./catalog";
import { Checkout, CheckoutComplete } from "./checkout";
import { CollectionShowcase } from "./collection-showcase";
import { AuthForm, CartPage, errorMessage, Lookup, OrderList, PageTitle, ProductAdmin, post, type ResolvedLine } from "./order-flow";
import { Icon, matchesProduct, ProductMenu, QuickCart, SearchBox } from "./storefront-controls";

const logo = "/images/brand/1.webp";
const nav = [["Trang chủ", "/"], ["Dòng sản phẩm", "/dong-san-pham"], ["Mua sắm", "/shopping"], ["Giới thiệu", "/gioi-thieu"]];
// Giỏ cũ lưu trên trình duyệt (trước khi giỏ chuyển lên máy chủ). Được gộp vào tài khoản một lần rồi xóa.
const legacyCartKey = "handigo.cart.v1";
// Sản phẩm khách chọn trước khi đăng nhập, được thêm vào giỏ ngay sau khi đăng nhập.
const pendingAddKey = "handigo.pending-add.v1";
const pendingAddAge = 30 * 60_000;
const noteKey = "handigo.note.v1";
const featuredProducts = new Map([
  ["b-02pro", "Khoảng 20 ngày mỗi lần sạc"],
  ["a-014", "Sò lạnh làm mát sau 3–5 giây"],
  ["mc570", "570 ml · Lòng bình inox 316", "Hồng"],
  ["b-26", "Pin dùng đến 30 ngày", "Xanh"],
  ["mc650", "650 ml · Lòng bình inox 316", "Đen"],
  ["a-028", "Để bàn hoặc kẹp · Pin đến 23 giờ"],
  ["mc500", "500 ml · Lòng bình inox 316", "Vàng"],
  ["mc1200", "Dung tích lớn 1,2 lít", "Xám"],
  ["mpi480", "Chất liệu inox 304", "Nâu"],
  ["mc870", "870 ml · Lòng bình inox 316", "Hồng"],
].map(([slug, benefit, color], rank) => [slug, { rank, benefit, color }]));

function Header({ screen, count, account, products, openCart }: {
  screen: string; count: number; account: Account | null; products: Product[]; openCart: () => void;
}) {
  const query = useSearchParams();
  const term = screen === "shopping" ? query.get("q") ?? "" : "";
  const [searchOpen, setSearchOpen] = useState(false);
  const searchToggle = useRef<HTMLButtonElement>(null);
  const accountUrl = account ? "/tai-khoan" : "/dang-nhap";
  function closeSearch() {
    setSearchOpen(false);
  }
  const navigation = () => nav.map(([label, href]) =>
    href === "/shopping"
      ? <ProductMenu key={href} label={label} products={products} active={screen === "shopping"} onNavigate={closeSearch} />
      : <Link href={href} key={href} onClick={closeSearch} aria-current={href === "/" + screen ? "page" : undefined}>
        {label}
      </Link>);
  const searchButton = <button type="button" ref={searchToggle} className="icon-button"
    aria-label={searchOpen ? "Đóng tìm kiếm" : "Mở tìm kiếm"} aria-expanded={searchOpen}
    onClick={() => setSearchOpen(!searchOpen)}>
    <Icon name={searchOpen ? "close" : "search"} />
  </button>;
  const searchPanel = searchOpen && <div className="header-search-popover" onKeyDown={(event) => {
    if (event.key !== "Escape") return;
    setSearchOpen(false);
    searchToggle.current?.focus();
  }}>
    <SearchBox key={term} initialTerm={term} products={products} screen={screen} onNavigate={closeSearch} />
  </div>;
  return <header className="header">
    <div className="wrap header-inner">
      <Link className="brand" href="/" aria-label="HandiGo · Trang chủ"><img src={logo} alt="HandiGo" /></Link>
      <nav className="main-nav" aria-label="Điều hướng chính">{navigation()}</nav>
      <div className="tools">
        {searchButton}
        <button className="icon-button" aria-haspopup="dialog" aria-label={"Giỏ hàng · " + count + " sản phẩm"} onClick={openCart}>
          <Icon name="cart" />{count > 0 && <span key={count} className="cart-count">{count}</span>}
        </button>
        <Link className="icon-button" href={accountUrl} aria-label={account ? "Tài khoản" : "Đăng nhập"}><Icon name="user" /></Link>
      </div>
      {searchPanel}
    </div>
  </header>;
}

function Footer() {
  return <footer className="footer"><div className="wrap footer-grid">
    <div><Link className="brand" href="/" aria-label="HandiGo · Trang chủ"><img src={logo} alt="HandiGo" /></Link><p>Tiện ích hằng ngày</p></div>
    <div><h2>Khám phá</h2><Link href="/dong-san-pham">Dòng sản phẩm</Link><Link href="/shopping">Shopping</Link><Link href="/gioi-thieu">Về HandiGo</Link></div>
    <div><h2>Hỗ trợ</h2><Link href="/tra-cuu-don">Tra cứu đơn hàng</Link><Link href="/chinh-sach/giao-hang">Giao hàng</Link><Link href="/chinh-sach/doi-tra">Đổi trả</Link><Link href="/chinh-sach/bao-hanh">Bảo hành</Link></div>
    <div id="lien-he">
      <h2>Liên hệ</h2>
      <a href="tel:0862011397">0862 011 397</a>
      <a href="mailto:handigo.shop@gmail.com">handigo.shop@gmail.com</a>
      <a href="https://www.facebook.com/profile.php?id=61595162400373">Facebook HandiGo</a>
    </div>
  </div><div className="wrap footer-bottom">© HandiGo · Website demo</div></footer>;
}

function ProductGrid({ products, add, soldBySlug, ratings }: {
  products: Product[]; add: AddToCart; soldBySlug?: Record<string, number>; ratings?: Record<string, ProductRating>;
}) {
  return <div className="product-grid">{products.map((product) => <ProductCard key={product.slug} product={product} add={add}
    showcase={soldBySlug && { ...featuredProducts.get(product.slug), sold: soldBySlug[product.slug] ?? 0, rating: ratings?.[product.slug] }} />)}</div>;
}

function Home({ products, add }: { products: Product[]; add: AddToCart }) {
  return <>
    <Hero />
    <HomeShowcase products={products} />
    <div className="wrap home-content">
      <div className="service-strip">
        <Link href="/chinh-sach/giao-hang"><Icon name="box" /><span>Thanh toán khi nhận hàng</span></Link>
        <Link href="/chinh-sach/bao-hanh"><Icon name="shield" /><span>Thông tin bảo hành</span></Link>
        <Link href="/lien-he"><Icon name="headset" /><span>Hỗ trợ từ HandiGo</span></Link>
      </div>
      <section><div className="section-heading"><div><p className="eyebrow">Tuyển chọn MAGIC</p><h2>Sản phẩm nổi bật</h2></div><Link className="text-link" href="/shopping">Xem tất cả ↗</Link></div>
        <ProductGrid products={products.filter((product) => ["b-02pro", "b-26", "a-028", "mc500"].includes(product.slug))} add={add} /></section>
    </div>
  </>;
}

function Shopping({ products, add, soldBySlug, ratings }: {
  products: Product[]; add: AddToCart; soldBySlug: Record<string, number>; ratings?: Record<string, ProductRating>;
}) {
  const query = useSearchParams();
  const group = query.get("nhom") ?? "";
  const term = query.get("q") ?? "";
  const sort = query.get("sapxep") ?? "";
  const offersOnly = query.get("uudai") === "1";
  const showAll = !group && !term && !offersOnly;
  function change(values: Record<string, string>) {
    const params = new URLSearchParams(query.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    window.history.replaceState(null, "", params.size ? "/shopping?" + params : "/shopping");
  }
  const offers = products.filter((product) => discount(product) > 0);
  const maxDiscount = Math.max(0, ...offers.map(discount));
  const results = (offersOnly ? offers : products).filter((product) =>
    (!group || product.category === group) && matchesProduct(product, term));
  results.sort((a, b) => {
    if (sort === "asc" && a.price !== b.price) return a.price - b.price;
    if (sort === "desc" && a.price !== b.price) return b.price - a.price;
    if (sort === "banchay") {
      const difference = (soldBySlug[b.slug] ?? 0) - (soldBySlug[a.slug] ?? 0);
      if (difference) return difference;
    }
    return (featuredProducts.get(a.slug)?.rank ?? featuredProducts.size) -
      (featuredProducts.get(b.slug)?.rank ?? featuredProducts.size);
  });

  return <>
    <div className="shop-banner">
      <img src="/images/banners/collections/4.webp" alt="" />
      <div><p className="eyebrow">HandiGo · MAGIC</p><h1>Tiện ích mỗi ngày</h1>
        {maxDiscount > 0 ? <div className="shop-promotion">
          <p><strong>Giảm đến {maxDiscount}%</strong> · Giá từ {money(Math.min(...offers.map((product) => product.price)))}</p>
          <Link className="button" href="/shopping?uudai=1#san-pham">Xem ưu đãi <Icon name="arrow" size={16} /></Link>
        </div> : <p>Chọn món đồ phù hợp với nhịp sống của bạn.</p>}
      </div>
    </div>
    <div className="filters" id="san-pham">
      <div className="filter-chips" aria-label="Nhóm sản phẩm">
        <button className="filter-chip" aria-pressed={showAll} onClick={() => change({ q: "", nhom: "", uudai: "" })}>
          Tất cả sản phẩm
        </button>
        {categories.map((category) => <button className="filter-chip" key={category.slug}
          aria-pressed={group === category.slug} onClick={() => change({ nhom: category.slug })}>{category.name}</button>)}
      </div>
      <select aria-label="Sắp xếp sản phẩm" value={sort} onChange={(event) => change({ sapxep: event.target.value })}>
        <option value="">Nổi bật</option>
        <option value="banchay">Bán chạy</option>
        <option value="asc">Giá thấp → cao</option>
        <option value="desc">Giá cao → thấp</option>
      </select>
    </div>
    <div className="result-count"><p className="muted" aria-live="polite">
      {showAll ? `${products.length} sản phẩm` : `${results.length} trên ${products.length} sản phẩm`}
      {offersOnly && " đang ưu đãi"}
      {term && <> cho <b>“{term}”</b></>}
    </p>
      {term && <button className="plain" onClick={() => change({ q: "" })}>Xóa từ khóa</button>}</div>
    {results.length ? <ProductGrid products={results} add={add} soldBySlug={soldBySlug} ratings={ratings} /> :
      <div className="panel empty"><h2>Không tìm thấy sản phẩm</h2><button className="button" onClick={() => change({ q: "", nhom: "", sapxep: "", uudai: "" })}>Xem tất cả</button></div>}
  </>;
}

const policies: Record<string, { title: string; text: string }> = {
  "giao-hang": { title: "Giao hàng", text: "Phí giao hàng của bản demo được hiển thị ở bước thanh toán. Đơn thử nghiệm được lưu để nhóm thao tác trạng thái giao hàng." },
  "doi-tra": { title: "Đổi trả", text: "Liên hệ HandiGo kèm mã đơn và tình trạng sản phẩm để được hướng dẫn về điều kiện đổi hàng." },
  "bao-hanh": { title: "Bảo hành", text: "Vui lòng xem thời hạn bảo hành trong thông tin từng sản phẩm và liên hệ HandiGo để được hỗ trợ." },
};

function Info({ screen, slug }: { screen: string; slug?: string }) {
  if (screen === "dong-san-pham") return <CollectionShowcase />;
  if (screen === "gioi-thieu") return <section className="wrap about" aria-labelledby="about-title">
    <h1 id="about-title">Về chúng tôi</h1>
    <p className="about-mission">Mang những tiện ích thông minh đến gần hơn với cuộc sống thường ngày, giúp mỗi khoảnh khắc trở nên đơn giản và trọn vẹn hơn.</p>
    <div className="about-content">
      <img className="about-photo" src="/images/banners/magic-health-gift.webp"
        alt="Quà tặng sức khỏe MAGIC với máy tăm nước và bàn chải điện trên nền xanh" />
      <div className="about-story">
        <h2>Ra đời năm 2026</h2>
        <p>HandiGo là cửa hàng bán lẻ chuyên cung cấp các sản phẩm MAGIC chính hãng – thương hiệu đến từ Hàn Quốc. Từ thiết bị chăm sóc cá nhân đến những vật dụng tiện ích hằng ngày, chúng tôi lựa chọn các sản phẩm có thiết kế nhỏ gọn, tính năng thông minh và mức giá dễ tiếp cận. HandiGo mong muốn mang đến trải nghiệm mua sắm đáng tin cậy, giúp khách hàng tận hưởng cuộc sống tiện nghi hơn theo cách đơn giản nhất.</p>
      </div>
    </div>
  </section>;
  if (screen === "lien-he") return <>
    <PageTitle tag="HandiGo" title="Liên hệ" />
    <section className="panel narrow"><h2>Hỗ trợ khách hàng</h2><p>Hotline <a className="text-link" href="tel:0862011397">0862 011 397</a></p>
      <p>Email <a className="text-link" href="mailto:handigo.shop@gmail.com">handigo.shop@gmail.com</a></p>
      <Link className="button" href="/tra-cuu-don">Tra cứu đơn hàng</Link></section>
  </>;
  const policy = policies[slug ?? ""];
  return <><PageTitle tag="Hỗ trợ" title={policy.title} /><div className="panel narrow"><p>{policy.text}</p><Link className="text-link" href="/lien-he">Liên hệ HandiGo ↗</Link></div></>;
}

const validLine = (line: unknown): line is CartLine => !!line && typeof line === "object" &&
  typeof (line as CartLine).variantId === "string" && Number.isSafeInteger((line as CartLine).quantity) &&
  (line as CartLine).quantity > 0 && (line as CartLine).quantity <= 99;

function readLegacyCart(): CartLine[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(legacyCartKey) ?? "[]");
    return Array.isArray(saved) ? saved.filter(validLine).slice(0, 50) : [];
  } catch {
    return [];
  }
}

type PendingAdd = CartLine & { buyNow: boolean; at: number };

function takePendingAdd(): PendingAdd | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(pendingAddKey) ?? "null") as PendingAdd | null;
    sessionStorage.removeItem(pendingAddKey);
    return validLine(saved) && typeof saved.at === "number" && Date.now() - saved.at < pendingAddAge ? saved : null;
  } catch {
    return null;
  }
}

export default function Shop({ screen, slug, products, account, cart: savedCart, checkout, orders, accountAddresses, soldBySlug = {}, ratings, reviews }: {
  screen: string; slug?: string; products: Product[]; account: Account | null; cart: CartLine[]; orders: Order[];
  accountAddresses?: AddressBookEntry[];
  checkout?: {
    pricing: CheckoutPricing; estimate: string; addresses: AddressBookEntry[]; fallbackAddress: CheckoutAddress | null;
    vouchers: CheckoutVoucher[];
  } | { order: Order };
  soldBySlug?: Record<string, number>;
  ratings?: Record<string, ProductRating>;
  reviews?: ProductReview[];
}) {
  const router = useRouter();
  // Giỏ lấy từ máy chủ mỗi lần trang được tải lại; giữa các lần đó cập nhật theo phản hồi của API giỏ hàng.
  const [cart, setCart] = useState(savedCart);
  const [syncedCart, setSyncedCart] = useState(savedCart);
  if (syncedCart !== savedCart) {
    setSyncedCart(savedCart);
    setCart(savedCart);
  }
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<{ message: string; added: boolean }>();
  const toastTimer = useRef<number | undefined>(undefined);
  const cartDialog = useRef<HTMLDialogElement>(null);
  const cartRequest = useRef(0);
  const restoredFor = useRef<string | null>(null);
  const authScreen = screen === "dang-nhap" || screen === "dang-ky";

  useEffect(() => {
    setNote(localStorage.getItem(noteKey) ?? "");
    return () => window.clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    if (!account || restoredFor.current === account.id) return;
    restoredFor.current = account.id;
    void (async () => {
      const legacy = readLegacyCart();
      if (legacy.length) {
        try {
          await sendCart("merge", legacy);
          localStorage.removeItem(legacyCartKey);
        } catch {
          // Giữ lại giỏ cũ để thử gộp ở lần tải sau.
        }
      }
      const pending = takePendingAdd();
      if (pending && await add(pending.variantId, pending.quantity) && pending.buyNow && screen !== "gio-hang") {
        router.push("/gio-hang");
      }
    })();
    // Chỉ chạy một lần cho mỗi tài khoản đăng nhập.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id]);

  async function sendCart(operation: "list" | "add" | "set" | "merge", items: CartLine[] = []) {
    const request = ++cartRequest.current;
    const result = await post<{ cart: CartLine[] }>("cart", { operation, items });
    if (request === cartRequest.current) setCart(result.cart);
    return result.cart;
  }
  function saveNote(text: string) {
    localStorage.setItem(noteKey, text);
    setNote(text);
  }
  function show(message: string, added = false) {
    setToast({ message, added });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(undefined), 4200);
  }
  function openCart() {
    if (!account) {
      router.push("/dang-nhap?next=%2Fgio-hang");
      return;
    }
    setToast(undefined);
    cartDialog.current?.showModal();
  }
  function resolveLine(variantId: string, quantity: number): ResolvedLine | null {
    const product = products.find((item) => item.active && item.variants.some((variant) => variant.id === variantId));
    const variant = product?.variants.find((item) => item.id === variantId);
    return product && variant ? { product, variant, quantity } : null;
  }
  function adjust(variantId: string, quantity: number) {
    if (!account) return;
    if (quantity > 0 && !resolveLine(variantId, quantity)) return;
    setCart((current) => quantity <= 0 ? current.filter((line) => line.variantId !== variantId)
      : current.some((line) => line.variantId === variantId)
        ? current.map((line) => line.variantId === variantId ? { variantId, quantity } : line)
        : [...current, { variantId, quantity }]);
    sendCart("set", [{ variantId, quantity: Math.max(0, quantity) }]).catch((failure) => {
      show(errorMessage(failure));
      void sendCart("list").catch(() => undefined);
    });
  }
  async function add(variantId: string, quantity: number, buyNow = false) {
    if (!account) {
      // Ghi nhớ lựa chọn để tự thêm vào giỏ sau khi đăng nhập, giống luồng của các sàn TMĐT.
      try {
        sessionStorage.setItem(pendingAddKey, JSON.stringify({ variantId, quantity, buyNow, at: Date.now() }));
      } catch {
        // Trình duyệt chặn lưu tạm: khách vẫn được đưa đến trang đăng nhập.
      }
      const url = new URL(window.location.href);
      if (screen === "san-pham") url.searchParams.set("mau", variantId);
      const next = buyNow ? "/gio-hang" : url.pathname + url.search;
      router.push("/dang-nhap?them=1&next=" + encodeURIComponent(next));
      return false;
    }
    const line = resolveLine(variantId, quantity);
    const total = quantity + (cart.find((item) => item.variantId === variantId)?.quantity ?? 0);
    if (!line || total > Math.min(line.variant.stock, 99)) {
      show("Số lượng vượt quá tồn kho.");
      return false;
    }
    try {
      await sendCart("add", [{ variantId, quantity }]);
    } catch (failure) {
      show(errorMessage(failure));
      return false;
    }
    show("Đã thêm " + line.product.name + " vào giỏ.", true);
    return true;
  }
  async function reorder(items: Order["items"]) {
    if (!account || !items.length) return;
    const quantities = new Map(cart.map(({ variantId, quantity }) => [variantId, quantity]));
    for (const item of items) {
      const quantity = (quantities.get(item.variantId) ?? 0) + item.quantity;
      const line = resolveLine(item.variantId, quantity);
      if (!line || quantity > Math.min(line.variant.stock, 99)) {
        throw new Error(`${item.productName} (${item.variantName}) hiện không đủ hàng để thêm vào giỏ.`);
      }
      quantities.set(item.variantId, quantity);
    }
    await sendCart("add", items.map(({ variantId, quantity }) => ({ variantId, quantity })));
    router.push("/gio-hang");
  }
  async function logout() {
    try {
      await post("logout", {});
      router.replace("/");
      router.refresh();
    } catch {
      show("Chưa thể đăng xuất. Vui lòng thử lại.");
    }
  }

  const lines = account ? cart.flatMap((item) => resolveLine(item.variantId, item.quantity) ?? []) : [];
  let content: React.ReactNode;
  if (!screen) content = <Home products={products} add={add} />;
  else if (screen === "shopping") content = <Shopping products={products} add={add} soldBySlug={soldBySlug} ratings={ratings} />;
  else if (screen === "san-pham") content = <ProductDetail key={slug} product={products.find((item) => item.slug === slug)!} add={add}
    rating={slug ? ratings?.[slug] : undefined} sold={slug ? soldBySlug[slug] ?? 0 : 0} reviews={reviews ?? []}
    buyNow={async (variantId, quantity) => {
      if (await add(variantId, quantity, true)) router.push("/gio-hang");
    }} />;
  else if (screen === "gio-hang") content = <CartPage lines={lines} note={note} setNote={saveNote} adjust={adjust} missing={cart.length - lines.length} />;
  else if (checkout) content = "order" in checkout ? <CheckoutComplete order={checkout.order} /> :
    <Checkout lines={lines} pricing={checkout.pricing} estimate={checkout.estimate}
      addresses={checkout.addresses} fallbackAddress={checkout.fallbackAddress} vouchers={checkout.vouchers}
      note={note} setNote={saveNote} accountName={account?.name ?? ""} adjust={adjust} clear={(items) => {
        // Máy chủ đã bỏ phần đã đặt khỏi giỏ khi lưu đơn; ở đây chỉ cập nhật giao diện cho khớp.
        const ordered = new Map(items.map(({ variantId, quantity }) => [variantId, quantity]));
        setCart((current) => current.map((item) => ({
          ...item, quantity: item.quantity - (ordered.get(item.variantId) ?? 0),
        })).filter((item) => item.quantity > 0));
        saveNote("");
      }} />;
  else if (screen === "tra-cuu-don") content = <Lookup />;
  else if (authScreen) content = <AuthForm key={screen} register={screen === "dang-ky"} account={account} />;
  else if (screen === "tai-khoan" && account) content = <AccountPage account={account} orders={orders} products={products}
    addresses={accountAddresses ?? []} logout={logout} reorder={reorder} />;
  else if (screen === "quan-tri") content = <>
    <PageTitle tag="Quản trị HandiGo" title={slug === "don-hang" ? "Đơn hàng" : "Sản phẩm và tồn kho"} />
    <div className="detail-actions account-actions"><Link className="button secondary" href="/quan-tri/don-hang">Đơn hàng</Link>
      <Link className="button secondary" href="/quan-tri/san-pham">Sản phẩm</Link></div>
    {slug === "don-hang" ? <OrderList orders={orders} admin /> : <div className="admin-grid">{products.map((product) => <ProductAdmin key={product.slug} product={product} />)}</div>}
  </>;
  else content = <Info screen={screen} slug={slug} />;

  return <>
    <a className="skip" href="#noi-dung">Chuyển đến nội dung</a>
    {!authScreen && <Header key={screen} screen={screen} account={account}
      products={screen === "tai-khoan" ? products.filter((product) => product.active) : products} openCart={openCart}
      count={lines.reduce((sum, line) => sum + line.quantity, 0)} />}
    <main id="noi-dung" className={authScreen ? "auth-page" : checkout ? "checkout-page" : screen === "gioi-thieu" ? "about-page" : screen === "shopping" ? "wrap page shop-page" : screen === "tai-khoan" ? "wrap page account-page" : screen && screen !== "dong-san-pham" ? "wrap page" : ""}>{content}</main>
    {!authScreen && <Footer />}
    {!authScreen && account && <QuickCart dialogRef={cartDialog} lines={lines} adjust={adjust} />}
    <div className={toast ? "toast visible" : "toast"}><div role="status">{toast && <>
      <span className={toast.added ? "toast-check" : "toast-error"}>{toast.added ? <Icon name="check" size={16} /> : "!"}</span>
      <span>{toast.message}</span>
    </>}</div>{toast?.added && <button onClick={openCart}>Xem giỏ <Icon name="arrow" size={16} /></button>}</div>
  </>;
}

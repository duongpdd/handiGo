"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Product, ProductRating, ProductReview, Variant } from "@/lib/shop";
import { categories, discount, money } from "@/lib/shop";
import { Icon } from "./storefront-controls";

/** Thêm vào giỏ; trả về true khi sản phẩm đã được lưu vào giỏ của tài khoản. */
export type AddToCart = (id: string, quantity: number) => Promise<boolean>;

const banners = [
  {
    file: 5, label: "Chăm sóc răng miệng", title: "Chăm sóc răng miệng", accent: "hiệu quả mỗi ngày",
    text: "Máy tăm nước và bàn chải điện MAGIC nhỏ gọn, tiện dùng tại nhà hay mang theo khi đi xa.",
    alt: "Máy tăm nước và bàn chải điện MAGIC trên bàn gỗ",
    cta: ["7.48%", "63.72%", "18.25%", "7.3%"],
    target: "/shopping?nhom=cham-soc-rang-mieng",
  },
  {
    file: 3, label: "Bình giữ nhiệt · MC570", title: "Ấm áp theo bạn", accent: "mỗi ngày.",
    text: "Bình giữ nhiệt 570 ml với bốn màu để chọn, tiện mang theo khi đi học hay đi làm.",
    alt: "Bình giữ nhiệt MAGIC MC570 nhiều màu",
    cta: ["6.88%", "60.15%", "20.35%", "8.5%"],
    target: "/san-pham/mc570",
  },
  {
    file: 4, label: "Bình giữ nhiệt · MC1200", title: "Một bình lớn", accent: "cho ngày dài.",
    text: "Dung tích 1.200 ml và tay cầm chắc chắn cho những ngày bạn cần mang theo nhiều nước.",
    alt: "Ba bình giữ nhiệt MAGIC MC1200 có tay cầm",
    cta: ["6.87%", "66.61%", "20.43%", "8.48%"],
    target: "/san-pham/mc1200",
  },
  {
    file: 1, label: "Bình giữ nhiệt · MC650", title: "Cà phê buổi sáng,", accent: "mang theo dễ dàng.",
    text: "Cốc giữ nhiệt 650 ml với hai lựa chọn đen và trắng cho cà phê hoặc trà yêu thích.",
    alt: "Hai cốc giữ nhiệt MAGIC MC650 màu đen và trắng",
    cta: ["6.85%", "60.6%", "20.45%", "8.46%"],
    target: "/san-pham/mc650",
  },
  {
    file: 2, label: "Bình giữ nhiệt · MC870", title: "Sẵn sàng cho", accent: "ngày năng động.",
    text: "Bình giữ nhiệt 870 ml theo bạn từ bàn làm việc đến buổi tập.",
    alt: "Bình giữ nhiệt MAGIC MC870 trên bục trưng bày",
    cta: ["8.33%", "63.42%", "20.68%", "8.48%"],
    target: "/san-pham/mc870",
  },
];

export function Hero() {
  const [index, setIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const banner = banners[index];
  const [left, top, width, height] = banner.cta;
  const step = (delta: number) => setIndex((current) => (current + banners.length + delta) % banners.length);
  return <section className="hero" data-banner={banner.file}
    style={{ "--cta-left": left, "--cta-top": top, "--cta-width": width, "--cta-height": height } as CSSProperties}
    aria-label="Bộ sưu tập nổi bật của HandiGo" onKeyDown={(event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      step(event.key === "ArrowLeft" ? -1 : 1);
    }
  }}>
    <div className="hero-story" key={banner.file}>
      <p className="hero-kicker">MAGIC</p>
      <h1>{banner.title} <em>{banner.accent}</em></h1>
      <p className="hero-description">{banner.text}</p>
    </div>
    <Link className="hero-cta" href={banner.target}><span>Khám phá ngay</span><Icon name="arrow" size={20} /></Link>
    <div className="hero-media" onPointerDown={(event) => {
      if (event.pointerType !== "touch" || !event.isPrimary || (event.target as Element).closest("button")) return;
      touchStart.current = { x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
    }} onPointerCancel={() => { touchStart.current = null; }} onPointerUp={(event) => {
      const start = touchStart.current;
      touchStart.current = null;
      if (!start || event.pointerType !== "touch") return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx > 0 ? -1 : 1);
    }}>
      <img className={"hero-photo" + (banner.file === 5 ? " hero-photo-oral" : "")} key={banner.file}
        src={"/images/banners/home/" + banner.file + ".webp"} alt={banner.alt} draggable={false}
        fetchPriority={index === 0 ? "high" : "auto"} />
      <button className="hero-arrow prev" aria-label="Banner trước" onClick={() => step(-1)}>
        <svg width="28" height="42" viewBox="0 0 28 42" fill="none" aria-hidden="true"><path d="m18 8-12 13 12 13" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <button className="hero-arrow next" aria-label="Banner sau" onClick={() => step(1)}>
        <svg width="28" height="42" viewBox="0 0 28 42" fill="none" aria-hidden="true"><path d="m10 8 12 13-12 13" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
    <span className="hero-sr" role="status">{index + 1} / {banners.length} · {banner.label}</span>
  </section>;
}

const showcase = [
  { slug: "a-028", placement: "desk", image: "3" },
  { slug: "mc500", placement: "bottles", image: null },
  { slug: "b-02pro", placement: "flosser", image: "2" },
  { slug: "b-26", placement: "brush", image: null },
  { slug: "a-014", placement: "handheld", image: "9" },
];

export function HomeShowcase({ products }: { products: Product[] }) {
  return <section className="home-showcase" aria-labelledby="showcase-title">
    <h2 id="showcase-title"><strong>Nhỏ gọn</strong> trong tay,<br />Tiện ích <strong>mỗi ngày</strong></h2>
    <div className="wrap showcase-canvas">
      <p className="showcase-note note-desk">Nhỏ gọn bên bạn, dễ chịu cả ngày.</p>
      <p className="showcase-note note-brush">Tinh tế mỗi ngày,<br />tự tin mọi cuộc gặp.</p>
      <div className="showcase-note note-handheld">
        <p>Gọn trong túi, chỉn chu trong từng khoảnh khắc.</p>
        <Link href="/shopping" aria-label="Khám phá tất cả sản phẩm" className="showcase-all"><Icon name="arrow" size={23} /></Link>
      </div>
      {showcase.map(({ slug, image, placement }) => {
        const product = products.find((item) => item.slug === slug && item.active);
        if (!product) return null;
        return <Link key={slug} className={"showcase-photo showcase-" + placement} href={"/san-pham/" + slug}>
          <img className={image ? undefined : "showcase-reference-crop"}
            src={image ? `/images/products/${slug}/${image}.webp` : "/images/banners/home/showcase-reference.png"}
            alt={product.name} loading="lazy" />
          <span className="showcase-label" aria-hidden="true">{product.name} <Icon name="arrow" size={16} /></span>
        </Link>;
      })}
    </div>
  </section>;
}

const ratingFormat = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatRating = (value: number) => ratingFormat.format(value);

/** Năm ngôi sao tô theo tỉ lệ điểm, ví dụ 4,5 sao tô 90%. */
export function Stars({ value }: { value: number }) {
  return <span className="stars" role="img" aria-label={formatRating(value) + " trên 5 sao"}>
    <span aria-hidden="true">★★★★★</span>
    <span className="stars-fill" aria-hidden="true" style={{ width: Math.max(0, Math.min(100, value * 20)) + "%" }}>★★★★★</span>
  </span>;
}

function ColorPicker({ variants, selected, onSelect }: {
  variants: Variant[]; selected: Variant; onSelect: (variant: Variant) => void;
}) {
  return <div className="swatches" aria-label="Màu sắc">{variants.map((variant) =>
    <button key={variant.id} className="swatch" style={{ background: variant.hex }}
      title={variant.name + (variant.stock ? "" : " · Hết hàng")}
      aria-label={variant.name + (variant.stock ? "" : " · Hết hàng")}
      aria-pressed={selected.id === variant.id} onClick={() => onSelect(variant)} />)}</div>;
}

function AddButton({ variant, quantity, add }: { variant: Variant; quantity: number; add: AddToCart }) {
  const [added, setAdded] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(0), 1600);
    return () => window.clearTimeout(timer);
  }, [added]);
  return <button className={"button add-button" + (added && variant.stock ? " added" : "")} disabled={!variant.stock || busy}
    onClick={async () => {
      setBusy(true);
      try {
        if (await add(variant.id, quantity)) setAdded((count) => count + 1);
      } finally {
        setBusy(false);
      }
    }}>
    {variant.stock ? <><Icon name={added ? "check" : "add"} size={18} />{added ? "Đã thêm" : busy ? "Đang thêm…" : "Thêm vào giỏ"}</> : "Hết hàng"}
  </button>;
}

export function ProductCard({ product, add, showcase }: {
  product: Product;
  add: AddToCart;
  showcase?: { benefit?: string; color?: string; sold: number; rating?: ProductRating };
}) {
  const [selected, setSelected] = useState(() => (
    product.variants.find((variant) => variant.stock > 0 && variant.name === showcase?.color) ??
    product.variants.find((variant) => variant.stock > 0) ??
    product.variants[0]
  ).id);
  const variant = product.variants.find((item) => item.id === selected) ?? product.variants[0];
  const link = "/san-pham/" + product.slug + "?mau=" + variant.id;
  const sale = discount(product);
  const rating = showcase?.rating;
  return <article className={showcase ? "product-card shop-card" : "product-card"}>
    <Link className="product-photo" href={link}>
      <img key={variant.id} src={variant.image || product.images[0]} alt={product.name + " · " + variant.name} loading="lazy" />
      {sale > 0 && <span className="sale-tag">−{sale}%</span>}
    </Link>
    <div className="product-card-content">
      <span className="card-sku">MAGIC · {product.sku}</span>
      <div>
        <Link className="product-name" href={link}>{product.name}</Link>
        {showcase?.benefit && <p className="card-benefit">{showcase.benefit}</p>}
      </div>
      <div className="price"><strong>{money(product.price)}</strong>{product.listPrice > product.price && <del>{money(product.listPrice)}</del>}</div>
      {showcase && <div className="card-social">
        {rating?.count
          ? <span aria-label={`${formatRating(rating.average)} trên 5 sao, ${rating.count} đánh giá`}>
            <span className="card-star" aria-hidden="true">★</span> {formatRating(rating.average)} <span aria-hidden="true">({rating.count})</span>
          </span>
          : <span><span className="card-star" aria-hidden="true">☆</span> Chưa có đánh giá</span>}
        <span>Đã bán {showcase.sold.toLocaleString("vi-VN")}</span>
      </div>}
      <div className="card-colors"><ColorPicker variants={product.variants} selected={variant} onSelect={(item) => setSelected(item.id)} /><small>{variant.name}</small></div>
      <AddButton key={variant.id} variant={variant} quantity={1} add={add} />
    </div>
  </article>;
}

function ProductReviews({ rating, reviews }: { rating?: ProductRating; reviews: ProductReview[] }) {
  return <section className="product-reviews" id="danh-gia" aria-labelledby="danh-gia-title">
    <h2 id="danh-gia-title">Đánh giá sản phẩm</h2>
    {rating?.count ? <>
      <div className="review-summary">
        <p><strong>{formatRating(rating.average)}</strong> trên 5</p>
        <Stars value={rating.average} />
        <span className="muted">{rating.count.toLocaleString("vi-VN")} đánh giá từ khách đã nhận hàng</span>
      </div>
      <ul className="review-list">{reviews.map((review, index) => <li key={index} className="review-item">
        <span className="review-avatar" aria-hidden="true">{Array.from(review.reviewer)[0]}</span>
        <div>
          <p className="review-author">{review.reviewer}</p>
          <Stars value={review.rating} />
          {review.variants && <p className="review-variant">Phân loại: {review.variants}</p>}
          {review.comment && <p className="review-comment">{review.comment}</p>}
        </div>
      </li>)}</ul>
      {rating.count > reviews.length && <p className="muted">Đang hiển thị {reviews.length} đánh giá gần nhất.</p>}
    </> : <p className="muted">Chưa có đánh giá nào. Khách có thể đánh giá sau khi đơn hàng được giao thành công.</p>}
  </section>;
}

export function ProductDetail({ product, add, buyNow, rating, sold, reviews }: {
  product: Product; add: AddToCart; buyNow: (id: string, quantity: number) => Promise<void>;
  rating?: ProductRating; sold: number; reviews: ProductReview[];
}) {
  const initial = useSearchParams().get("mau");
  const fallback = product.variants.find((variant) => variant.stock > 0) ?? product.variants[0];
  const linked = product.variants.find((variant) => variant.id === initial);
  const [variantId, setVariantId] = useState(linked?.id ?? fallback.id);
  const [photo, setPhoto] = useState(linked?.image ?? product.images[0]);
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const variant = product.variants.find((item) => item.id === variantId) ?? fallback;
  const category = categories.find((item) => item.slug === product.category);
  const sale = discount(product);

  const select = (item: Variant) => {
    setVariantId(item.id);
    setPhoto(item.image);
    setQuantity(1);
  };

  return <>
    <div className="crumb"><Link href="/">Trang chủ</Link> / <Link href={"/shopping?nhom=" + product.category}>{category?.name}</Link> / {product.sku}</div>
    <div className="product-detail">
      <div className="gallery">
        <img key={photo} className="gallery-main" src={photo} alt={product.name} />
        <div className="thumbnails">{product.images.map((image, i) =>
          <button key={image} aria-label={"Ảnh " + (i + 1)} aria-pressed={photo === image} onClick={() => setPhoto(image)}>
            <img src={image} alt="" loading="lazy" />
          </button>)}</div>
      </div>
      <div className="product-info">
        <p className="eyebrow">MAGIC · {product.sku}</p>
        <h1>{product.name}</h1>
        <div className="detail-rating">
          {rating?.count ? <a href="#danh-gia"><strong>{formatRating(rating.average)}</strong> <Stars value={rating.average} /></a> : null}
          <a href="#danh-gia">{rating?.count ? rating.count.toLocaleString("vi-VN") + " đánh giá" : "Chưa có đánh giá"}</a>
          <span>Đã bán {sold.toLocaleString("vi-VN")}</span>
        </div>
        <div className="price detail-price"><strong>{money(product.price)}</strong>
          {product.listPrice > product.price && <del>{money(product.listPrice)}</del>}
          {sale > 0 && <span className="sale-tag">Tiết kiệm {sale}%</span>}
        </div>
        <div className="detail-row"><b>Màu sắc</b><ColorPicker variants={product.variants} selected={variant} onSelect={select} /><span>{variant.name}</span></div>
        <div className="detail-row"><b>Số lượng</b>
          <div className="stepper"><button aria-label="Giảm số lượng" disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)}>−</button>
            <span>{quantity}</span><button aria-label="Tăng số lượng" disabled={quantity >= Math.min(variant.stock, 99)} onClick={() => setQuantity(quantity + 1)}>+</button></div>
          <span className={variant.stock ? "in-stock" : ""}>{variant.stock ? "Còn hàng" : "Hết hàng"}</span>
        </div>
        <div className="detail-actions purchase-actions">
          <AddButton key={variant.id} variant={variant} quantity={quantity} add={add} />
          <button type="button" className="button purchase" disabled={!variant.stock || buying} onClick={async () => {
            setBuying(true);
            try {
              await buyNow(variant.id, quantity);
            } finally {
              setBuying(false);
            }
          }}>{buying ? "Đang xử lý…" : "Mua ngay"} <Icon name="arrow" size={18} /></button>
        </div>
        <h2>Thông tin sản phẩm</h2>
        <ul className="specs">{product.specs.map((spec) => <li key={spec}>{spec}</li>)}</ul>
        <a className="text-link" href={product.magicUrl} target="_blank" rel="noreferrer">Xem thông tin từ MAGIC ↗</a>
      </div>
    </div>
    <ProductReviews rating={rating} reviews={reviews} />
  </>;
}

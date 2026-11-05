"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "./storefront-controls";

const photos = [
  { file: 3, alt: "Quạt sạc cầm tay và quạt để bàn MAGIC" },
  { file: 1, alt: "Máy tăm nước MAGIC cầm tay" },
  { file: 4, alt: "Máy tăm nước MAGIC dùng hằng ngày" },
  { file: 2, alt: "Bộ sưu tập bình giữ nhiệt nhiều màu" },
  { file: 5, alt: "Bàn chải điện MAGIC" },
];

const slotOf = (photo: number, center: number) => (photo - center + photos.length + 2) % photos.length - 2;

export function CollectionShowcase() {
  const [selection, setSelection] = useState({ center: 2, previous: 2 });
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const { center, previous } = selection;

  function select(photo: number) {
    setSelection((current) => photo === current.center ? current : { center: photo, previous: current.center });
  }

  function step(direction: number) {
    setSelection((current) => ({
      center: (current.center + direction + photos.length) % photos.length,
      previous: current.center,
    }));
  }

  return <section className="collection-showcase" aria-labelledby="collection-title">
    <div className="collection-intro">
      <h1 id="collection-title">
        <em>Tiện ích</em>
        <span>Dòng sản phẩm</span>
        <i lang="en">everyday use</i>
      </h1>
      <p className="collection-lead">Từ chăm sóc cá nhân đến những tiện ích thường ngày.</p>
      <div className="collection-shop">
        <p>Khám phá những sản phẩm phù hợp với nhịp sống của bạn.</p>
        <Link href="/shopping" lang="en">Shop Now</Link>
      </div>
    </div>
    <div className="collection-gallery" role="group" aria-label="Ảnh giới thiệu sản phẩm" onKeyDown={(event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      step(event.key === "ArrowLeft" ? -1 : 1);
    }}>
      <div className="collection-stage" onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        suppressClick.current = false;
      }} onPointerMove={(event) => {
        const start = gesture.current;
        if (!start || start.id !== event.pointerId) return;
        const dx = Math.abs(event.clientX - start.x);
        const dy = Math.abs(event.clientY - start.y);
        if (dx > 12 && dx > dy * 1.3 && !event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }} onPointerCancel={() => { gesture.current = null; }} onPointerLeave={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) gesture.current = null;
      }} onPointerUp={(event) => {
        const start = gesture.current;
        if (!start || start.id !== event.pointerId) return;
        gesture.current = null;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) <= 42 || Math.abs(dx) <= Math.abs(dy) * 1.3) return;
        suppressClick.current = true;
        step(dx < 0 ? 1 : -1);
      }}>
        {photos.map(({ file, alt }, index) => {
          const slot = slotOf(index, center);
          const wraps = Math.abs(slot - slotOf(index, previous)) > 2;
          return <button className="collection-slide" key={file} data-slot={slot} data-wrap={wraps}
            aria-label={alt} aria-pressed={slot === 0} onClick={(event) => {
              if (event.detail === 0 || !suppressClick.current) select(index);
            }}>
            <img src={`/images/banners/collections/${file}.webp`} alt="" draggable={false} />
          </button>;
        })}
      </div>
      <div className="collection-controls">
        <button type="button" aria-label="Ảnh trước" className="collection-prev" onClick={() => step(-1)}><Icon name="arrow" size={19} /></button>
        <span role="status">{center + 1} / {photos.length}<span className="hero-sr"> · {photos[center].alt}</span></span>
        <button type="button" aria-label="Ảnh sau" onClick={() => step(1)}><Icon name="arrow" size={19} /></button>
      </div>
    </div>
  </section>;
}

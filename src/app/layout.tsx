import type { Metadata } from "next";
import "./globals.css";
import "./product-reviews.css";

export const metadata: Metadata = {
  title: { default: "HandiGo · Tiện ích hằng ngày", template: "%s | HandiGo" },
  description: "Khám phá các sản phẩm MAGIC tại HandiGo: chăm sóc răng miệng, quạt sạc và bình giữ nhiệt.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}

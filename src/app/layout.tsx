import type { Metadata } from "next";
import { Gelasio } from "next/font/google";
import "./globals.css";
import "./product-reviews.css";

// Gelasio có cùng số đo với Georgia và có đủ dấu tiếng Việt, nên bố cục tiêu đề không đổi.
const headingFont = Gelasio({
  subsets: ["latin", "vietnamese"], style: ["normal", "italic"], variable: "--font-heading", display: "swap",
});

export const metadata: Metadata = {
  title: { default: "HandiGo · Tiện ích hằng ngày", template: "%s | HandiGo" },
  description: "Khám phá các sản phẩm MAGIC tại HandiGo: chăm sóc răng miệng, quạt sạc và bình giữ nhiệt.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" className={headingFont.variable}><body>{children}</body></html>;
}

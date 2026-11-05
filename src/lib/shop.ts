export type Variant = {
  id: string;
  name: string;
  hex: string;
  image: string;
  stock: number;
};

export type Product = {
  sku: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  listPrice: number;
  campaignPrice: number;
  voucher: number | null;
  images: string[];
  variants: Variant[];
  specs: string[];
  magicUrl: string;
  shopeeUrl: string;
  tiktokUrl: string;
  active: boolean;
};

export type CartLine = { variantId: string; quantity: number };
export type Account = { id: string; name: string; email: string; role: "customer" | "admin" };

export function discount(product: Product) {
  return product.listPrice > product.price ? Math.round(100 * (1 - product.price / product.listPrice)) : 0;
}

export const categories = [
  { slug: "cham-soc-rang-mieng", name: "Chăm sóc răng miệng", text: "Chăm sóc nụ cười, tự tin mỗi ngày.", image: "/images/banners/collections/1.webp" },
  { slug: "quat-sac", name: "Quạt sạc", text: "Mát mẻ bên bạn, ở bất cứ đâu.", image: "/images/products/a-028/1.webp" },
  { slug: "binh-giu-nhiet", name: "Bình giữ nhiệt", text: "Giữ trọn nhiệt độ yêu thích.", image: "/images/products/mc650/3.webp" },
];

export const orderStatuses = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

export type OrderStatus = keyof typeof orderStatuses;
export const transitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipping", "cancelled"],
  shipping: ["delivered"],
  delivered: [],
  cancelled: [],
};

export type OrderReview = { rating: number; comment: string };

/** Điểm trung bình (làm tròn 1 chữ số) và số lượt đánh giá của một sản phẩm. */
export type ProductRating = { average: number; count: number };

/** Đánh giá hiển thị công khai trên trang sản phẩm. Tên người mua đã được che bớt. */
export type ProductReview = { reviewer: string; rating: number; comment: string; variants: string };

export type Order = {
  code: string;
  name: string;
  phone: string;
  address: string;
  note: string;
  subtotal: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  review?: OrderReview;
  items: { variantId: string; productName: string; variantName: string; unitPrice: number; quantity: number }[];
};

export const money = (value: number) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
}).format(value);

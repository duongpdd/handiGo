import { notFound, redirect } from "next/navigation";
import Shop from "@/components/shop";
import { currentAccount } from "@/server/auth";
import { listCart } from "@/server/cart";
import { checkoutPricing, checkoutVouchers, deliveryEstimate } from "@/server/checkout";
import { listCheckoutAddresses } from "@/server/checkout-addresses";
import { listProducts } from "@/server/db";
import { checkoutAddress, checkoutOrder, listOrders, listSoldQuantities } from "@/server/orders";
import { listProductRatings, listProductReviews } from "@/server/reviews";

export const dynamic = "force-dynamic";

const screens: Record<string, number> = {
  "": 1, "dong-san-pham": 1, shopping: 1, "san-pham": 2, "gio-hang": 1,
  "thanh-toan": 1, "tra-cuu-don": 1, "dang-nhap": 1, "dang-ky": 1,
  "tai-khoan": 1, "gioi-thieu": 1, "lien-he": 1, "chinh-sach": 2, "quan-tri": 2,
};

export default async function Page({ params, searchParams }: {
  params: Promise<{ screen?: string[] }>;
  searchParams: Promise<{ don?: string | string[] }>;
}) {
  const segments = (await params).screen ?? [""];
  const [screen, slug] = segments;
  const complete = screen === "thanh-toan" && slug === "hoan-tat" && segments.length === 2;
  if (!Object.hasOwn(screens, screen) || (screens[screen] !== segments.length && !complete)) notFound();
  if (screen === "quan-tri" && slug !== "don-hang" && slug !== "san-pham") notFound();
  if (screen === "chinh-sach" && !["giao-hang", "doi-tra", "bao-hanh"].includes(slug)) notFound();
  const account = await currentAccount();
  if (!account && (screen === "gio-hang" || screen === "thanh-toan")) {
    redirect("/dang-nhap?next=" + encodeURIComponent("/" + screen));
  }
  if ((screen === "quan-tri" || screen === "tai-khoan") && !account) redirect("/dang-nhap");
  if (screen === "quan-tri" && account?.role !== "admin") redirect("/tai-khoan");
  const products = await listProducts(screen === "quan-tri" || screen === "tai-khoan");
  if (screen === "san-pham" && !products.some((product) => product.slug === slug)) notFound();
  const orders = account && (screen === "tai-khoan" || (screen === "quan-tri" && slug === "don-hang"))
    ? await listOrders(account, screen === "quan-tri")
    : [];
  let checkout;
  if (screen === "thanh-toan" && account) {
    if (complete) {
      const { don } = await searchParams;
      const order = typeof don === "string" && /^HG-[A-F0-9]{14}$/.test(don) ? await checkoutOrder(account, don) : null;
      if (!order) notFound();
      checkout = { order };
    } else {
      const addresses = await listCheckoutAddresses(account);
      checkout = { pricing: checkoutPricing, estimate: deliveryEstimate(new Date()), addresses,
        fallbackAddress: addresses.length ? null : await checkoutAddress(account), vouchers: checkoutVouchers };
    }
  }
  const storefront = screen === "shopping" || screen === "san-pham";
  return <Shop screen={screen} slug={slug} account={account} products={products}
    cart={account ? await listCart(account) : []}
    checkout={checkout} orders={orders} accountAddresses={screen === "tai-khoan" && account ? await listCheckoutAddresses(account) : undefined}
    soldBySlug={storefront ? await listSoldQuantities() : undefined}
    ratings={storefront ? await listProductRatings() : undefined}
    reviews={screen === "san-pham" ? await listProductReviews(slug) : undefined} />;
}

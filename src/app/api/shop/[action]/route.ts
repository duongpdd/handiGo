import { NextRequest, NextResponse } from "next/server";
import { authenticate, currentAccount, fail, ShopError, signOut } from "@/server/auth";
import { updateCart } from "@/server/cart";
import { getCheckoutVoucher, normalizeVoucher } from "@/server/checkout";
import { updateCheckoutAddresses } from "@/server/checkout-addresses";
import { changeOrderStatus, lookupOrder, placeOrder, reviewOrder, updateProduct } from "@/server/orders";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  try {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.headers.get("host")) fail("Yêu cầu không hợp lệ.", 403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) fail("Dữ liệu không hợp lệ.", 415);
    const raw = await request.text();
    if (raw.length > 20_000) fail("Yêu cầu quá lớn.", 413);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw);
    } catch {
      fail("Dữ liệu không hợp lệ.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) fail("Dữ liệu không hợp lệ.");
    const { action } = await context.params;
    const account = await currentAccount();
    if (action === "login" || action === "register") {
      await authenticate(body, action === "register", request.nextUrl.protocol === "https:");
    } else if (action === "logout") {
      await signOut();
    } else if (action === "cart") {
      if (!account) fail("Vui lòng đăng nhập để dùng giỏ hàng.", 401);
      return NextResponse.json({ cart: updateCart(account, body) });
    } else if (action === "order") {
      if (!account) fail("Vui lòng đăng nhập để đặt hàng.", 401);
      return NextResponse.json({ order: placeOrder(body, account) });
    } else if (action === "checkout-voucher") {
      if (!account) fail("Vui lòng đăng nhập để áp dụng mã giảm giá.", 401);
      return NextResponse.json(getCheckoutVoucher(normalizeVoucher(body.code)));
    } else if (action === "checkout-address") {
      if (!account) fail("Vui lòng đăng nhập để lưu địa chỉ.", 401);
      return NextResponse.json({ addresses: updateCheckoutAddresses(account, body) });
    } else if (action === "lookup") {
      return NextResponse.json({ order: lookupOrder(body) });
    } else if (action === "cancel-order" || action === "review-order") {
      if (!account) fail("Vui lòng đăng nhập để quản lý đơn hàng.", 401);
      return action === "cancel-order"
        ? NextResponse.json({ order: changeOrderStatus(body, account) })
        : NextResponse.json({ review: reviewOrder(body, account) });
    } else if (action === "product" || action === "status") {
      if (account?.role !== "admin") fail("Bạn cần đăng nhập bằng tài khoản quản trị.", 403);
      if (action === "product") updateProduct(body);
      if (action === "status") return NextResponse.json({ order: changeOrderStatus(body) });
    } else {
      fail("Không tìm thấy chức năng.", 404);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ShopError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Hệ thống đang bận. Vui lòng thử lại." }, { status: 500 });
  }
}

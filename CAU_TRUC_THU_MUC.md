# Cấu trúc thư mục HandiGo

Dự án dùng Next.js App Router, React, TypeScript và SQLite. Giao diện, xử lý API và cơ sở dữ liệu cùng nằm trong một dự án.

## Cây thư mục

```text
WEB/
├── QUY_TRINH_THUC_HIEN.md
├── CAU_TRUC_THU_MUC.md
├── README.md
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
├── .env.example
├── .gitignore
├── data/
│   └── catalog.json
├── public/
│   ├── checkout-addresses.json
│   └── images/
│       ├── brand/
│       ├── banners/
│       │   ├── home/
│       │   ├── collections/
│       │   └── magic-health-gift.webp
│       └── products/
│           ├── a-014/
│           ├── a-028/
│           ├── b-02pro/
│           ├── b-26/
│           ├── mc500/
│           ├── mc570/
│           ├── mc650/
│           ├── mc870/
│           ├── mc1200/
│           └── mpi480/
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── product-reviews.css
    │   ├── not-found.tsx
    │   ├── [[...screen]]/
    │   │   └── page.tsx
    │   └── api/
    │       └── shop/
    │           └── [action]/
    │               └── route.ts
    ├── components/
    │   ├── shop.tsx
    │   ├── catalog.tsx
    │   ├── collection-showcase.tsx
    │   ├── storefront-controls.tsx
    │   ├── order-flow.tsx
    │   ├── checkout.tsx
    │   ├── checkout-address.tsx
    │   ├── checkout-vouchers.tsx
    │   └── account.tsx
    ├── lib/
    │   ├── shop.ts
    │   ├── checkout.ts
    │   └── checkout-shipping.ts
    └── server/
        ├── db.ts
        ├── auth.ts
        ├── checkout.ts
        ├── checkout-addresses.ts
        ├── cart.ts
        ├── reviews.ts
        └── orders.ts
```

## Tìm file theo công việc

| Công việc | File phụ trách |
| --- | --- |
| Điều hướng, header, footer, Trang chủ, Mua sắm, Giới thiệu và trạng thái giỏ | [shop.tsx](src/components/shop.tsx) |
| Banner Trang chủ, ảnh tổng hợp, thẻ và chi tiết sản phẩm | [catalog.tsx](src/components/catalog.tsx) |
| Bộ ảnh cuộn của trang Dòng sản phẩm | [collection-showcase.tsx](src/components/collection-showcase.tsx) |
| Menu Mua sắm, tìm kiếm, biểu tượng và giỏ nhanh | [storefront-controls.tsx](src/components/storefront-controls.tsx) |
| Giỏ đầy đủ, biểu mẫu tài khoản, tra cứu đơn và màn hình quản trị | [order-flow.tsx](src/components/order-flow.tsx) |
| Biểu mẫu checkout, bảng tổng tiền và trang cảm ơn | [checkout.tsx](src/components/checkout.tsx) |
| Biểu mẫu địa chỉ, sổ địa chỉ và nút chọn mặc định | [checkout-address.tsx](src/components/checkout-address.tsx) |
| Hộp thoại chọn voucher và mã nhập tay | [checkout-vouchers.tsx](src/components/checkout-vouchers.tsx) |
| Hồ sơ, Đơn mua, bộ lọc trạng thái và thao tác trên từng đơn | [account.tsx](src/components/account.tsx) |
| Màu sắc, bố cục và giao diện theo kích thước màn hình | [globals.css](src/app/globals.css) |
| Giao diện sao và khu vực đánh giá sản phẩm | [product-reviews.css](src/app/product-reviews.css) |
| Kiểu sản phẩm, đơn hàng, trạng thái và định dạng tiền | [lib/shop.ts](src/lib/shop.ts) |
| Điều kiện voucher và công thức tổng tiền dùng chung | [lib/checkout.ts](src/lib/checkout.ts) |
| Bảng cước, xác định tuyến và tính phí theo khối lượng | [checkout-shipping.ts](src/lib/checkout-shipping.ts) |
| Cấu hình cước, danh sách mã voucher và thời gian giao dự kiến | [server/checkout.ts](src/server/checkout.ts) |
| Phiên đăng nhập và xác thực | [auth.ts](src/server/auth.ts) |
| Kiểm tra và lưu sổ địa chỉ theo tài khoản | [server/checkout-addresses.ts](src/server/checkout-addresses.ts) |
| Giỏ hàng lưu theo tài khoản: đọc, thêm, đặt số lượng, gộp giỏ cũ | [cart.ts](src/server/cart.ts) |
| Điểm trung bình và danh sách đánh giá theo sản phẩm | [reviews.ts](src/server/reviews.ts) |
| Lưu đơn, kiểm tra giá và tồn, hủy đơn, đánh giá và cập nhật sản phẩm | [orders.ts](src/server/orders.ts) |
| Khởi tạo SQLite, nạp danh mục và bổ sung ảnh cho dữ liệu đã có | [db.ts](src/server/db.ts) |

## Trang và API

[`src/app/[[...screen]]/page.tsx`](src/app/%5B%5B...screen%5D%5D/page.tsx) nhận đường dẫn, kiểm tra quyền truy cập, đọc dữ liệu cần thiết và chuyển màn hình tương ứng cho `Shop`.

| Nhóm trang | Đường dẫn |
| --- | --- |
| Cửa hàng | `/`, `/dong-san-pham`, `/shopping`, `/san-pham/[slug]` |
| Mua hàng | `/gio-hang`, `/thanh-toan`, `/thanh-toan/hoan-tat?don=<mã-đơn>` |
| Tài khoản | `/dang-nhap`, `/dang-ky`, `/tai-khoan` |
| Thông tin và hỗ trợ | `/gioi-thieu`, `/lien-he`, `/tra-cuu-don`, `/chinh-sach/[slug]` |
| Quản trị | `/quan-tri/don-hang`, `/quan-tri/san-pham` |

[`src/app/api/shop/[action]/route.ts`](src/app/api/shop/%5Baction%5D/route.ts) nhận JSON qua `POST /api/shop/[action]`.

| Nhóm | Giá trị `action` |
| --- | --- |
| Tài khoản | `register`, `login`, `logout` |
| Giỏ hàng | `cart` |
| Thanh toán | `checkout-address`, `checkout-voucher`, `order` |
| Đơn mua và tra cứu | `cancel-order`, `review-order`, `lookup` |
| Quản trị | `product`, `status` |

## Dữ liệu và cấu hình khi chạy

- [catalog.json](data/catalog.json) chứa dữ liệu khởi tạo. Với cơ sở dữ liệu đã chạy, cập nhật giá, trạng thái bán và tồn kho qua quản trị. Khi bổ sung ảnh, đặt tệp trong `public/images/products/<slug>/` rồi thêm đường dẫn vào `images` của sản phẩm trong danh mục. Khi khởi tạo, máy chủ bổ sung đường dẫn ảnh mới vào bản ghi đã lưu.
- [checkout-addresses.json](public/checkout-addresses.json) chứa danh mục hành chính dùng để hiển thị và kiểm tra địa chỉ. Các ảnh trong `public/images/` được phục vụ theo đường dẫn bắt đầu bằng `/images/`.
- SQLite mặc định lưu tại `.runtime/handigo.sqlite`. Các bảng chính gồm `products`, `variants`, `users`, `sessions`, `checkout_addresses`, `cart_items`, `orders`, `order_items` và `order_reviews`. Giỏ hàng lưu trên máy chủ theo tài khoản; giỏ cũ trong `localStorage` được gộp vào tài khoản một lần khi đăng nhập. Trình duyệt chỉ còn lưu lời nhắn đang nhập bằng `localStorage`.
- [.env.example](.env.example) là mẫu cho `.env.local`, gồm đường dẫn cơ sở dữ liệu, tài khoản quản trị khởi tạo, và cấu hình cước. `.env.local`, `.runtime/`, `.next/` và `node_modules/` nằm ngoài phần mã nguồn chia sẻ qua Git.
- [package.json](package.json) khai báo `dev`, `check`, `build` và `start`. Xem hướng dẫn chạy và thiết lập quản trị trong [README](README.md).

Xem các giai đoạn triển khai trong [Quy trình thực hiện](QUY_TRINH_THUC_HIEN.md).

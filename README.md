# HandiGo

Website demo bán lẻ 10 sản phẩm MAGIC. Giao diện dựa trên mockup Canva của nhóm, sử dụng ảnh đã cung cấp qua Google Drive.

## Chạy trên máy

Cần Node.js 24.12 trở lên. Từ thư mục dự án:

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Mở http://localhost:3000. SQLite tự khởi tạo khi mở trang lần đầu. File mặc định nằm tại `.runtime/handigo.sqlite`.

Để mở phần quản trị, đặt `HANDIGO_ADMIN_EMAIL` và `HANDIGO_ADMIN_PASSWORD` (ít nhất 12 ký tự) trong `.env.local` trước khi chạy. Đăng nhập bằng thông tin vừa đặt và chọn **Vào quản trị**. Tài khoản quản trị được tạo một lần trên mỗi cơ sở dữ liệu. Thay đổi giá trị mật khẩu trong file cấu hình không đổi mật khẩu của tài khoản đã tạo.

## Luồng demo

- Dùng Shopping để tìm theo tên hoặc mã, lọc danh mục và sắp xếp giá.
- Chọn màu, thêm giỏ, nhập thông tin giao hàng thử nghiệm và đặt COD. Lưu mã đơn để tra cứu cùng số điện thoại đặt hàng.
- Quản trị có thể đổi giá, trạng thái bán, ảnh và tồn kho theo màu, rồi xác nhận, chuyển giao hoặc hủy đơn. Hủy đơn trước khi giao hoàn lại tồn kho.
- Đăng ký và đăng nhập để xem đơn đã đặt bằng tài khoản đó.

Giá bán khởi tạo từ cột DAILY của tab **Đề thi ND1**. Tồn khởi tạo là 15 mỗi màu. Thanh toán COD trong demo ghi đơn vào hệ thống và cập nhật tồn kho. Việc chuyển trạng thái giao hàng thao tác thủ công. Giá CAMP được giữ trong dữ liệu nguồn để đối chiếu. Voucher lấy theo cột VOUCHER của tab này: `HANDIGO20` (20.000đ) cho 8 sản phẩm, `HANDIGO40` (40.000đ) cho MC650, riêng MC570 không có voucher.

Checkout ước tính cước theo tuyến và nấc 500 g của [Vietnam Post](https://vnpost.vn/vi/gioi-thieu/san-pham-dich-vu/chuyen-phat-trong-nuoc/dich-vu-chuyen-phat-tieu-chuan-thuong-mai-dien-tu). Chỉnh nơi gửi và khối lượng đóng gói ước tính bằng `HANDIGO_SHIPPING_ORIGIN` và `HANDIGO_SHIPPING_GRAMS_PER_ITEM`. `HANDIGO_SHIPPING_FEE` là mức tạm tính cho địa chỉ cũ thiếu tỉnh/thành. Mọi đơn đều tính phí vận chuyển. Voucher chỉ áp dụng cho tiền hàng.

## Mã nguồn

| Thư mục | Nội dung |
| --- | --- |
| `src/app/` | Trang, định tuyến, CSS và API |
| `src/components/` | Giao diện cửa hàng, danh mục, giỏ và luồng đơn |
| `src/server/` | SQLite, đăng nhập, kiểm tra giá và xử lý đơn |
| `src/lib/shop.ts` | Kiểu dữ liệu, danh mục và định dạng giá |
| `data/catalog.json` | Dữ liệu nạp ban đầu. Sửa giá và tồn của bản đã chạy qua quản trị |
| `public/images/` | Logo, banner và ảnh sản phẩm đã tối ưu |

Chạy `npm run check` để kiểm tra TypeScript. Dùng `npm run build` rồi `npm start` để chạy bản build. Giữ thư mục dữ liệu SQLite trên ổ lưu trữ bền vững khi triển khai trên một máy chủ Node.

## Triển khai trên Vercel

Vercel không giữ file trên máy chủ, nên bản triển khai cần cơ sở dữ liệu [Turso](https://turso.tech). Tạo database ở vùng `aws-us-east-1` (gần vùng `iad1` mà app đang chạy), rồi thêm `TURSO_DATABASE_URL` và `TURSO_AUTH_TOKEN` vào Environment Variables của dự án trên Vercel và deploy lại. Bảng và dữ liệu sản phẩm tự khởi tạo ở lần chạy đầu. Khi thiếu hai biến này, trang vẫn xem được nhưng đăng ký và đăng nhập sẽ báo lỗi.


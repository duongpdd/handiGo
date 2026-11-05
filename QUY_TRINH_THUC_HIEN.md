# Quy trình thực hiện website HandiGo

HandiGo là website demo bán lẻ 10 sản phẩm MAGIC, gồm giao diện mua sắm, hệ thống tài khoản, đặt hàng COD và khu vực quản trị. Tài liệu ghi lại các công việc đã thực hiện theo từng giai đoạn.

## 1. Chốt bố cục và chuẩn bị dữ liệu

- Dùng mockup của nhóm để xác định bố cục Trang chủ, Dòng sản phẩm, Giới thiệu và Đăng nhập. Tham khảo cách tổ chức danh mục, thẻ sản phẩm, checkout và Đơn mua của các sàn TMĐT, đồng thời dùng nhận diện HandiGo với nền kem và đỏ đô. [Mockup Canva](https://www.canva.com/design/DAGvuqqiPaw/3SJC71f-BqZ90R9eqv6vHg/edit)
- Chuẩn hóa 10 sản phẩm thành 3 nhóm gồm chăm sóc răng miệng (2), quạt sạc (2) và bình giữ nhiệt (6). Lưu SKU, giá niêm yết, giá bán ban đầu, thông số, ảnh và biến thể màu. Giá bán ban đầu lấy từ cột DAILY của tab Đề thi ND1. [Bảng sản phẩm](https://docs.google.com/spreadsheets/d/1mvVQQL68A4EYbWRcGtauBr5Zs698U-zE/edit?gid=2132154187#gid=2132154187)
- Tổ chức ảnh theo sản phẩm và mục đích sử dụng. Bổ sung 9 ảnh WebP từ OneDrive vào trang chi tiết, gồm 4 ảnh B-02PRO, 1 ảnh B-26 và 4 ảnh A-014. Lọc ảnh trùng, ảnh quảng cáo thương hiệu, ảnh livestream và ảnh có thông số chưa nhất quán.

## 2. Xây dựng giao diện và luồng chọn hàng

- Làm banner Trang chủ với nút **Khám phá ngay**, nút chuyển trái/phải và hỗ trợ vuốt. Đặt ảnh tổng hợp các nhóm hàng bên dưới banner. Xây trang Dòng sản phẩm dạng bộ ảnh giới thiệu có thể chọn, kéo hoặc chuyển bằng phím mũi tên.
- Đồng bộ header với tên **Mua sắm**, menu danh mục, biểu tượng tìm kiếm, giỏ hàng và tài khoản. Đưa thông tin liên hệ xuống footer và giữ footer ở cuối màn hình khi nội dung ngắn.
- Hoàn thiện trang Mua sắm với tìm kiếm theo tên hoặc mã, lọc nhóm, nút **Xem ưu đãi** và sắp xếp theo nổi bật, bán chạy hoặc giá. Số đã bán được tính từ các đơn đã giao.
- Hoàn thiện thẻ và trang chi tiết sản phẩm với giá bán, giá niêm yết, huy hiệu giảm giá, màu, ảnh và số lượng. Khách cần đăng nhập trước khi thêm hàng. Giỏ hỗ trợ đổi số lượng, xóa sản phẩm và lưu tạm trên trình duyệt.

## 3. Xây dựng tài khoản, thanh toán và lưu đơn

- Làm trang đăng ký, đăng nhập và đăng xuất. Máy chủ lưu phiên đăng nhập và phân quyền khách hàng, quản trị viên.
- Thiết kế checkout một cột. Trên điện thoại, thanh dưới cùng hiển thị tổng tiền và nút **Đặt hàng**. Checkout hiển thị sản phẩm, phí vận chuyển, voucher, lời nhắn, COD và bảng chi tiết thanh toán.
- Làm sổ địa chỉ dùng chung giữa checkout và tài khoản. Khách có thể lưu nhiều địa chỉ, sửa và đặt một địa chỉ mặc định. Biểu mẫu dùng 34 tỉnh/thành và danh sách phường, xã, đặc khu tương ứng. Số điện thoại gồm 10 chữ số, bắt đầu bằng 0. Hai loại địa chỉ hiển thị đầy đủ là **Văn phòng** và **Nhà riêng**. [Nguồn danh sách 34 tỉnh/thành](https://xaydungchinhsach.chinhphu.vn/chi-tiet-34-don-vi-hanh-chinh-cap-tinh-tu-12-6-2025-119250612141845533.htm)
- Tính phí giao theo tuyến và nấc khối lượng 500 g. Voucher giảm tiền hàng và phí vận chuyển tính riêng. Máy chủ kiểm tra lại tồn kho, điều kiện voucher và tổng tiền trước khi lưu đơn. [Nguồn biểu cước Vietnam Post](https://vnpost.vn/vi/gioi-thieu/san-pham-dich-vu/chuyen-phat-trong-nuoc/dich-vu-chuyen-phat-tieu-chuan-thuong-mai-dien-tu)
- Voucher lấy theo cột VOUCHER của tab Đề thi ND1. Sản phẩm không có giá trị ở cột này thì không có voucher. Tab không ghi mã nên HandiGo đặt tên mã theo mức giảm. Mỗi đơn chọn tối đa một mã và giảm một lần trên giá bán hiện tại. [Bảng voucher](https://docs.google.com/spreadsheets/d/1mvVQQL68A4EYbWRcGtauBr5Zs698U-zE/edit?gid=2132154187#gid=2132154187)

| Mã voucher | Mức giảm | SKU áp dụng |
| --- | ---: | --- |
| `HANDIGO20` | 20.000đ | B-02PRO, B-26, A-028, A-014, MC500, MC870, MC1200, MPI480 |
| `HANDIGO40` | 40.000đ | MC650 |

Khi khách đặt hàng thành công, hệ thống lưu đơn cùng giá tại thời điểm mua, trừ tồn theo màu và chuyển đến trang cảm ơn có mã đơn. Yêu cầu đặt hàng lặp dùng cùng mã yêu cầu để tránh tạo thêm đơn.

## 4. Hoàn thiện Đơn mua và quản trị

- Làm trang **Đơn mua** với tab trạng thái có số đếm, tìm theo mã hoặc tên sản phẩm, mã rút gọn và nút sao chép mã đầy đủ. Thẻ nhiều sản phẩm hiển thị dòng đầu và cho mở danh sách. Chi tiết đơn có tiến trình, địa chỉ nhận và bảng thanh toán từ dữ liệu đã lưu.
- Cho khách xác nhận hủy đơn đang chờ xác nhận, đánh giá đơn đã giao và mua lại đơn đã giao hoặc đã hủy. Khi mua lại, giỏ kiểm tra tồn kho hiện tại trước khi thêm hàng. Khách cũng có thể tra cứu bằng mã đơn đầy đủ và số điện thoại.
- Xây khu vực quản trị để cập nhật giá, trạng thái bán, ảnh và tồn kho theo màu. Quản trị viên chuyển trạng thái đơn thủ công. Khi hủy hợp lệ, hệ thống hoàn lại tồn kho.

## 5. Kiểm tra và chạy demo

Các lượt kiểm tra đã thực hiện gồm kiểm tra kiểu TypeScript, build Next.js và thử các luồng chính bằng dữ liệu mẫu. Đã kiểm tra việc chọn loại địa chỉ, voucher đúng hoặc sai SKU, lưu đơn COD, hủy đơn, lưu đánh giá, mua lại và mở ảnh mới trên cả ba trang sản phẩm.

Từ thư mục dự án trên Windows, dùng Node.js 24.12 trở lên. Chỉ sao chép cấu hình mẫu khi chưa có `.env.local`.

```powershell
npm.cmd install
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm.cmd run dev
```

Mở [HandiGo trên máy](http://localhost:3000). Để trình diễn trọn luồng, có thể đăng nhập, chọn màu sản phẩm, thêm vào giỏ, đặt COD rồi mở **Đơn mua**. Bản demo ghi nhận đơn trong SQLite và chuyển trạng thái giao hàng qua quản trị. Tùy chọn chuyển khoản QR đang ở trạng thái **Sắp có**.

Xem vị trí mã nguồn và dữ liệu trong [Cấu trúc thư mục](CAU_TRUC_THU_MUC.md).

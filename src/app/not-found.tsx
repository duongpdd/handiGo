import Link from "next/link";
export default function NotFound() {
  return <main className="wrap page"><h1>Không tìm thấy trang</h1><p>Trang này có thể đã được chuyển hoặc sản phẩm đã ngừng bán.</p><Link className="button" href="/shopping">Về cửa hàng</Link></main>;
}

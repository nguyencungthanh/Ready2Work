"use client";
import Link from "next/link";
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto max-w-xl px-6 py-20"><p className="text-sm font-semibold text-primary">Ready2Work</p><h1 className="mt-3 text-2xl font-bold">Chưa tải được dữ liệu</h1><p className="mt-4 text-muted">Kết nối đang gặp gián đoạn. Dữ liệu đã lưu trong tài khoản sẽ được khôi phục khi kết nối hoạt động trở lại.</p><div className="mt-6 flex gap-5"><button onClick={reset} className="rounded-lg bg-primary px-5 py-3 font-semibold text-white">Thử lại</button><Link href="/" className="self-center text-sm font-semibold text-primary">Về trang chủ</Link></div></main>;
}

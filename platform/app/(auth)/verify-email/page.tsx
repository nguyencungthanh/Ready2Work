import Link from "next/link";

export const metadata = { title: "Kiểm tra email" };

export default function VerifyEmailPage() {
  return (
    <main className="w-full">
      <h1 className="text-2xl font-bold text-foreground">Kiểm tra email</h1>
      <p className="mt-3 text-sm text-muted">
        Nếu email đủ điều kiện đăng ký, bạn sẽ nhận được liên kết xác thực. Mở liên kết mới nhất trên cùng trình duyệt và thiết bị đã đăng ký để kích hoạt tài khoản. Mỗi liên kết chỉ dùng một lần.
      </p>
      {process.env.NODE_ENV === "development" && <p className="mt-3 text-sm text-muted">
        Khi chạy trên máy, mở hộp thư thử nghiệm tại{" "}
        <code className="rounded bg-navy-700 px-1 py-0.5">localhost:54324</code> để đọc email.
      </p>}
      <p className="mt-6 text-sm text-muted">
        <Link href="/signin" className="font-medium text-primary underline transition-colors duration-200">
          Quay lại đăng nhập
        </Link>
      </p>
    </main>
  );
}

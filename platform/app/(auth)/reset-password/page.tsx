import Link from "next/link";
import { requestPasswordResetAction } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Đặt lại mật khẩu" };

export default function ResetPasswordPage() {
  return (
    <main className="w-full">
      <h1 className="text-2xl font-bold text-foreground">Đặt lại mật khẩu</h1>
      <p className="mt-2 mb-6 text-sm text-muted">
        Nhập email để yêu cầu liên kết đặt lại mật khẩu.
      </p>
      <p className="mb-6 text-sm text-muted">Mở liên kết mới nhất trên cùng trình duyệt và thiết bị bạn dùng để gửi yêu cầu. Mỗi liên kết chỉ dùng một lần.</p>

      <AuthForm
        action={requestPasswordResetAction}
        submitLabel="Gửi liên kết đặt lại mật khẩu"
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
      />

      <p className="mt-6 text-sm text-muted">
        <Link href="/signin" className="font-medium text-primary underline transition-colors duration-200">
          Quay lại đăng nhập
        </Link>
      </p>
    </main>
  );
}

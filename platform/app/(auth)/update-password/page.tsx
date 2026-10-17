import { updatePasswordAction } from "../actions";
import { AuthForm } from "../auth-form";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Đặt mật khẩu mới" };

export default async function UpdatePasswordPage() {
  await requireUser();
  return (
    <main className="w-full">
      <h1 className="text-2xl font-bold text-foreground">Đặt mật khẩu mới</h1>
      <p className="mt-2 mb-6 text-sm text-muted">Chọn mật khẩu mới khác với mật khẩu hiện tại.</p>

      <AuthForm
        action={updatePasswordAction}
        submitLabel="Cập nhật mật khẩu"
        fields={[
          {
            name: "password",
            label: "Mật khẩu mới (ít nhất 12 ký tự)",
            type: "password",
            autoComplete: "new-password",
          },
          {
            name: "confirmPassword",
            label: "Xác nhận mật khẩu mới",
            type: "password",
            autoComplete: "new-password",
          },
        ]}
      />
    </main>
  );
}

import Link from "next/link";
import { signUpAction } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const business = (await searchParams).type === "business";
  return (
    <main className="w-full">
      <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
      <p className="mt-2 mb-6 text-sm text-muted">
        {business ? "Tạo tài khoản bằng email công ty, sau đó hoàn thành hồ sơ doanh nghiệp." : "Bắt đầu hành trình nghề nghiệp và lưu kết quả luyện tập theo tài khoản của bạn."}
      </p>
      <div className="mb-6 flex gap-3 text-sm font-semibold"><Link href="/signup" aria-current={!business ? "page" : undefined} className={!business ? "text-primary underline" : "text-muted"}>Ứng viên</Link><Link href="/signup?type=business" aria-current={business ? "page" : undefined} className={business ? "text-primary underline" : "text-muted"}>Doanh nghiệp</Link></div>

      <AuthForm
        action={signUpAction}
        submitLabel="Create account"
        hidden={{ accountType: business ? "business" : "candidate" }}
        fields={[
          { name: "displayName", label: "Full name", autoComplete: "name" },
          { name: "email", label: business ? "Email công ty" : "Email", type: "email", autoComplete: "email" },
          {
            name: "password",
            label: "Password (at least 12 characters)",
            type: "password",
            autoComplete: "new-password",
          },
          {
            name: "confirmPassword",
            label: "Confirm password",
            type: "password",
            autoComplete: "new-password",
          },
        ]}
        checkbox={{ name: "acceptTerms", label: "I accept the terms of service and privacy policy" }}
      />

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/signin" className="font-medium text-primary underline transition-colors duration-200">
          Sign in
        </Link>
      </p>
    </main>
  );
}

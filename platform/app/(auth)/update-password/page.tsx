import { updatePasswordAction } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Set a new password" };

export default function UpdatePasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-bold text-foreground">Set a new password</h1>
      <p className="mt-2 mb-6 text-sm text-muted">Choose a password you have not used before.</p>

      <AuthForm
        action={updatePasswordAction}
        submitLabel="Update password"
        fields={[
          {
            name: "password",
            label: "New password (at least 12 characters)",
            type: "password",
            autoComplete: "new-password",
          },
          {
            name: "confirmPassword",
            label: "Confirm new password",
            type: "password",
            autoComplete: "new-password",
          },
        ]}
      />
    </main>
  );
}

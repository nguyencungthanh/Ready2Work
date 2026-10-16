import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Section 26.5 "Role access": a mentee must not reach admin routes, and an
// admin must. Uses the service role to grant the role directly, since the
// approval UI is exercised by the integration tests.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

if (!process.env.SUPABASE_SECRET_KEY) {
  throw new Error("SUPABASE_SECRET_KEY must be set to run role-access e2e tests.");
}
const SERVICE_KEY: string = process.env.SUPABASE_SECRET_KEY;
const PASSWORD = "Ready2Work-Test-1";

function admin() {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

async function createConfirmedUser(role?: string) {
  const client = admin();
  const email = `e2e-role-${crypto.randomUUID()}@example.com`;

  const { data, error } = await client.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(error?.message ?? "user creation failed");

  if (role) {
    await client.from("user_roles").insert({ user_id: data.user.id, role });
  }

  return { id: data.user.id, email };
}

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu",{exact:true}).fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập →" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe("role-based route access", () => {
  test("a mentee cannot reach the admin area", async ({ page }) => {
    const user = await createConfirmedUser();
    try {
      await signIn(page, user.email);

      await expect(
        page.getByRole("link", { name: "Review role applications" }),
      ).toHaveCount(0);

      await page.goto("/admin/role-applications");
      await expect(page).toHaveURL(/\/forbidden/);
    } finally {
      await admin().auth.admin.deleteUser(user.id);
    }
  });

  test("an admin can reach the admin area", async ({ page }) => {
    const user = await createConfirmedUser("admin");
    try {
      await signIn(page, user.email);

      await page.goto("/admin/role-applications");
      await expect(page).toHaveURL(/\/admin\/role-applications/);
      await expect(page.getByRole("heading", { name: "Role applications" })).toBeVisible();
    } finally {
      await admin().auth.admin.deleteUser(user.id);
    }
  });

  test("a suspended user is blocked from protected pages", async ({ page }) => {
    const user = await createConfirmedUser();
    try {
      await signIn(page, user.email);

      await admin().from("profiles").update({ account_status: "suspended" }).eq("id", user.id);

      // The session cookie is still valid, but access must stop immediately.
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/suspended/);
    } finally {
      await admin().auth.admin.deleteUser(user.id);
    }
  });

  test("an anonymous visitor is redirected away from the account page", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/signin\?next=%2Faccount/);
  });
});

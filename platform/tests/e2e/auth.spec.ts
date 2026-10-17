import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const PASSWORD = "Ready2Work-Test-1";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const local = /^http:\/\/(localhost|127\.0\.0\.1):54321\/?$/.test(url);
const secret = process.env.SUPABASE_SECRET_KEY;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin = local && secret ? createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
const emails = new Set<string>();
const MAILPIT = "http://localhost:54324";

function uniqueEmail(label: string): string {
  const email = `e2e-auth-${label}-${randomUUID()}@example.com`;
  emails.add(email);
  return email;
}
function userClient() { return createClient(url, publishable!, { auth: { persistSession: false, autoRefreshToken: false } }); }

test.beforeEach(() => { test.skip(!admin || !publishable, "Chỉ kiểm tài khoản và email trong Supabase local."); });
test.afterEach(async ({ request }) => {
  if (!admin) return;
  for (const email of emails) {
    const profile = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    expect(profile.error).toBeNull();
    let id = profile.data?.id;
    if (!id) {
      // Also remove a failed-signup fixture whose missing profile is the bug under test.
      const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      expect(users.error).toBeNull();
      id = users.data.users.find((user) => user.email === email)?.id;
    }
    if (id) expect((await admin.auth.admin.deleteUser(id)).error).toBeNull();
    const messages = await request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    expect(messages.ok()).toBe(true);
    const body = await messages.json() as { messages: { ID: string }[] };
    if (body.messages.length) expect((await request.delete(`${MAILPIT}/api/v1/messages`, { data: { IDs: body.messages.map((message) => message.ID) } })).ok()).toBe(true);
  }
  emails.clear();
});

async function signUp(page: Page, email: string, name = "Kiểm thử tài khoản") {
  await page.goto("/signup?type=candidate");
  await page.getByLabel("Họ và tên", { exact: true }).fill(name);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu (ít nhất 12 ký tự)", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Xác nhận mật khẩu", { exact: true }).fill(PASSWORD);
  await page.getByLabel(/Tôi đồng ý với Điều khoản/).check();
  await page.getByRole("button", { name: "Tạo tài khoản →", exact: true }).click();
  await expect(page).toHaveURL(/\/verify-email/);
}
async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/signin");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập →", exact: true }).click();
}
async function signOut(page: Page) {
  await page.locator(".account-menu > summary").click();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL("/");
}

/** Follow local mail links; optionally exercise Supabase's native PKCE verification redirect. */
async function openLatestEmailLink(request: APIRequestContext, email: string, page: Page, flow: "token_hash" | "pkce" = "token_hash") {
  let messageId: string | undefined;
  await expect.poll(async () => {
    const response = await request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    expect(response.ok()).toBe(true);
    const body = await response.json() as { messages: { ID: string }[] };
    messageId = body.messages[0]?.ID;
    return Boolean(messageId);
  }, { timeout: 15_000, message: "Email xác thực local phải được gửi tới Mailpit." }).toBe(true);
  const detail = await request.get(`${MAILPIT}/api/v1/message/${messageId}`);
  const { HTML, Text } = await detail.json() as { HTML?: string; Text?: string };
  const raw = (HTML || Text || "").match(/https?:\/\/[^\s"'<>]*(?:token_hash|token)=[^\s"'<>]*/)?.[0];
  expect(Boolean(raw), "Email phải có liên kết xác thực.").toBe(true);
  const link = new URL(raw!.replace(/&amp;/g, "&"));
  expect(["localhost", "127.0.0.1"].includes(link.hostname), "Liên kết fixture phải ở local, không truy cập cloud.").toBe(true);
  if (flow === "pkce" && link.searchParams.has("token_hash")) {
    const native = new URL("/auth/v1/verify", url);
    native.searchParams.set("token", link.searchParams.get("token_hash")!);
    // Custom POST verifyOtp accepts the generic email type; the native
    // signup verification link uses signup, as the default Supabase email does.
    const type = link.searchParams.get("type")!;
    native.searchParams.set("type", type === "email" ? "signup" : type);
    const callback = new URL("/auth/confirm", "http://localhost:3000");
    if (link.searchParams.get("type") === "recovery") callback.searchParams.set("type", "recovery");
    native.searchParams.set("redirect_to", callback.href);
    link.href = native.href;
  }
  await request.delete(`${MAILPIT}/api/v1/messages`, { data: { IDs: [messageId] } });
  let usedCode = false;
  const observe = (input: import("@playwright/test").Request) => {
    const callback = new URL(input.url());
    if (callback.pathname === "/auth/confirm" && callback.searchParams.has("code")) usedCode = true;
  };
  page.on("request", observe);
  try { await page.goto(link.href); } finally { page.off("request", observe); }
  if (flow === "pkce") expect(usedCode, "Supabase phải chuyển mã PKCE tới callback thật.").toBe(true);
  if (/\/(dashboard|business)$/.test(new URL(page.url()).pathname) && await page.evaluate(() => Boolean(sessionStorage.getItem("r2w:onboarding")))) {
    await page.getByRole("button", { name: "Tạm đóng thiết lập", exact: true }).click();
    await page.evaluate(() => sessionStorage.removeItem("r2w:onboarding"));
  }
}

test.describe("sign-up validation", () => {
  test("rejects a weak password", async ({ page }) => {
    await page.goto("/signup?type=candidate");
    await page.getByLabel("Họ và tên").fill("Kiểm thử mật khẩu");
    await page.getByLabel("Email", { exact: true }).fill(uniqueEmail("weak"));
    await page.getByLabel("Mật khẩu (ít nhất 12 ký tự)").fill("short");
    await page.getByLabel("Xác nhận mật khẩu").fill("short");
    await page.getByLabel(/Tôi đồng ý với Điều khoản/).check();
    await page.getByRole("button", { name: "Tạo tài khoản →" }).click();
    await expect(page.getByText("Mật khẩu cần ít nhất 12 ký tự", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });
  test("rejects mismatched password confirmation", async ({ page }) => {
    await page.goto("/signup?type=candidate");
    await page.getByLabel("Họ và tên").fill("Kiểm thử xác nhận");
    await page.getByLabel("Email", { exact: true }).fill(uniqueEmail("mismatch"));
    await page.getByLabel("Mật khẩu (ít nhất 12 ký tự)").fill(PASSWORD);
    await page.getByLabel("Xác nhận mật khẩu").fill(`${PASSWORD}-different`);
    await page.getByLabel(/Tôi đồng ý với Điều khoản/).check();
    await page.getByRole("button", { name: "Tạo tài khoản →" }).click();
    await expect(page.getByText("Mật khẩu xác nhận chưa khớp", { exact: true })).toBeVisible();
  });
  test("requires accepting terms", async ({ page }) => {
    await page.goto("/signup?type=candidate");
    await page.getByLabel("Họ và tên").fill("Kiểm thử điều khoản");
    await page.getByLabel("Email", { exact: true }).fill(uniqueEmail("terms"));
    await page.getByLabel("Mật khẩu (ít nhất 12 ký tự)").fill(PASSWORD);
    await page.getByLabel("Xác nhận mật khẩu").fill(PASSWORD);
    await page.getByRole("button", { name: "Tạo tài khoản →" }).click();
    await expect(page.getByText("Bạn cần đồng ý điều khoản để tiếp tục", { exact: true })).toBeVisible();
  });
});

test.describe("email verification and sessions", () => {
  for (const flow of ["token_hash", "pkce"] as const) {
    test(`signup confirms through ${flow}, persists a profile and survives sign-out/sign-in`, async ({ page, request }) => {
      const email = uniqueEmail(flow);
      await signUp(page, email);
      const pending = await userClient().auth.signInWithPassword({ email, password: PASSWORD });
      expect(pending.error?.code).toBe("email_not_confirmed");
      await openLatestEmailLink(request, email, page, flow);
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByRole("heading", { name: "Xin chào, Kiểm thử tài khoản", exact: true })).toBeVisible();
      await page.reload();
      await expect(page).toHaveURL(/\/dashboard/);
      const client = userClient();
      const login = await client.auth.signInWithPassword({ email, password: PASSWORD });
      expect(login.error).toBeNull();
      const id = login.data.user!.id;
      const profile = await client.from("profiles").select("id,display_name,email,account_status").eq("id", id).single();
      expect(profile.error).toBeNull();
      expect(profile.data).toMatchObject({ id, display_name: "Kiểm thử tài khoản", email, account_status: "active" });
      const roles = await client.from("user_roles").select("role").eq("user_id", id);
      expect(roles.error).toBeNull();
      expect(roles.data?.map((row) => row.role)).toEqual(["mentee"]);
      await signOut(page);
      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/signin\?next=%2Fdashboard/);
      await signIn(page, email);
      await expect(page).toHaveURL(/\/dashboard/);
      const persisted = await admin!.from("profiles").select("id").eq("email", email).single();
      expect(persisted.error).toBeNull();
      expect(persisted.data?.id).toBe(id);
    });
  }
  test("shows an actionable message when the email is not confirmed", async ({ page }) => {
    const email = uniqueEmail("unconfirmed");
    await signUp(page, email);
    await signIn(page, email);
    await expect(page.getByText("Email chưa được xác thực. Hãy mở email xác nhận trước khi đăng nhập.", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/signin/);
  });
  test("uses the same error for an unknown email and an existing account's wrong password", async ({ page }) => {
    const email = uniqueEmail("wrong");
    const created = await admin!.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    expect(created.error).toBeNull();
    for (const attempted of [email, uniqueEmail("unknown")]) {
      await signIn(page, attempted, "WrongPassword-123");
      await expect(page.getByText("Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.", { exact: true })).toBeVisible();
      await expect(page).toHaveURL(/\/signin/);
    }
  });
  test("protects private routes and preserves the return path", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/signin\?next=%2Fdashboard/);
    await page.goto("/simulations?industry=Marketing");
    expect(new URL(page.url()).pathname).toBe("/signin");
    expect(new URL(page.url()).searchParams.get("next")).toBe("/simulations?industry=Marketing");
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Đăng ký", exact: true })).toBeVisible();
  });
  test("revokes a deleted account's existing session without a sign-in redirect loop", async ({ page }) => {
    const email = uniqueEmail("deleted-session");
    const created = await admin!.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
    expect(created.error).toBeNull();
    await signIn(page, email);
    await expect(page).toHaveURL(/\/dashboard/);
    expect((await admin!.from("profiles").update({ account_status: "deleted" }).eq("id", created.data.user!.id)).error).toBeNull();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/signin/);
    await page.reload();
    await expect(page).toHaveURL(/\/signin/);
  });
});

test.describe("password recovery", () => {
  test("explains a recovery link opened in a different browser without signing that browser in", async ({ page, request, browser }) => {
    const email = uniqueEmail("reset-other-browser");
    expect((await admin!.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })).error).toBeNull();
    await page.goto("/reset-password");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Gửi liên kết đặt lại mật khẩu", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Nếu email có tài khoản");
    const otherBrowser = await browser.newContext();
    try {
      const otherPage = await otherBrowser.newPage();
      await openLatestEmailLink(request, email, otherPage, "pkce");
      await expect(otherPage).toHaveURL(/\/signin\?error=browser_context_missing/);
      await expect(otherPage.getByRole("main").getByRole("alert")).toContainText("cùng trình duyệt, cùng thiết bị");
      await otherPage.goto("/dashboard");
      await expect(otherPage).toHaveURL(/\/signin\?next=%2Fdashboard/);
    } finally { await otherBrowser.close(); }
  });

  test("reports a generic success for an unknown email", async ({ page }) => {
    await page.goto("/reset-password");
    await page.getByLabel("Email", { exact: true }).fill(uniqueEmail("unknown-reset"));
    await page.getByRole("button", { name: "Gửi liên kết đặt lại mật khẩu", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Nếu email có tài khoản, bạn sẽ nhận được liên kết đặt lại mật khẩu.");
  });
  for (const flow of ["token_hash", "pkce"] as const) {
    test(`recovers through ${flow}, rejects the old password and accepts the new password`, async ({ page, request }) => {
      const email = uniqueEmail(`reset-${flow}`);
      const created = await admin!.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { display_name: "Kiểm thử đặt lại" } });
      expect(created.error).toBeNull();
      await page.goto("/reset-password");
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page.getByRole("button", { name: "Gửi liên kết đặt lại mật khẩu", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("Nếu email có tài khoản");
      await openLatestEmailLink(request, email, page, flow);
      await expect(page).toHaveURL(/\/update-password/);
      const newPassword = `Ready2Work-Reset-${randomUUID()}`;
      await page.getByLabel("Mật khẩu mới (ít nhất 12 ký tự)", { exact: true }).fill(newPassword);
      await page.getByLabel("Xác nhận mật khẩu mới", { exact: true }).fill(newPassword);
      await page.getByRole("button", { name: "Cập nhật mật khẩu", exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard/);
      await signOut(page);
      await signIn(page, email, PASSWORD);
      await expect(page.getByText("Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.", { exact: true })).toBeVisible();
      await signIn(page, email, newPassword);
      await expect(page).toHaveURL(/\/dashboard/);
      expect((await admin!.from("profiles").select("id").eq("id", created.data.user!.id).single()).data?.id).toBe(created.data.user!.id);
    });
  }
});

test("education and city remain persisted after reload and signing in again", async ({ page, request }) => {
  test.setTimeout(60_000);
  const email = uniqueEmail("onboarding");
  await signUp(page, email, "Kiểm thử lưu hồ sơ");
  await openLatestEmailLink(request, email, page);
  await page.getByRole("button", { name: "Tiếp tục thiết lập →", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Thiết lập tài khoản" });
  await dialog.getByLabel("Trường Đại học / Cao đẳng", { exact: true }).fill("Đại học Kiểm thử");
  await dialog.getByLabel("Tỉnh/thành phố nơi bạn đang sinh sống", { exact: true }).fill("Hà Nội");
  await dialog.getByLabel("Chuyên ngành học", { exact: true }).fill("Quản trị kinh doanh");
  await dialog.getByLabel("Bạn đang ở giai đoạn nào?").selectOption("Năm 4");
  await dialog.getByRole("button", { name: "Tiếp tục →", exact: true }).click();
  await dialog.getByRole("button", { name: "Marketing", exact: true }).click();
  await dialog.getByRole("button", { name: "Tiếp tục →", exact: true }).click();
  await dialog.getByRole("button", { name: "Bỏ qua CV, tiếp tục →", exact: true }).click();
  await dialog.getByRole("button", { name: "Tiếp tục →", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: /Chào mừng bạn đến với/ })).toBeVisible();
  await dialog.getByRole("button", { name: "Bắt đầu hành trình →", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Tiếp tục thiết lập →", exact: true })).toHaveCount(0);
  await signOut(page);
  await signIn(page, email);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("button", { name: "Tiếp tục thiết lập →", exact: true })).toHaveCount(0);
  const client = userClient();
  const login = await client.auth.signInWithPassword({ email, password: PASSWORD });
  expect(login.error).toBeNull();
  expect(login.data.user?.user_metadata.onboarding_preferences).toMatchObject({ university: "Đại học Kiểm thử", city: "Hà Nội", educationStage: "Năm 4" });
  const profile = await client.from("profiles").select("university,major,city,graduation_year,onboarding_status").eq("id", login.data.user!.id).single();
  expect(profile.error).toBeNull();
  expect(profile.data).toEqual({ university: "Đại học Kiểm thử", major: "Quản trị kinh doanh", city: "Hà Nội", graduation_year: null, onboarding_status: "completed" });
});

import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const PASSWORD = "Ready2Work-Test-1";

function uniqueEmail(label: string): string {
  return `e2e-${label}-${process.pid}-${Date.now()}@example.com`;
}

const MAILPIT = "http://localhost:54324";

/**
 * Opens the newest action link sent to `email`. The local Supabase stack ships
 * Mailpit as its mail catcher, so both sign-up verification and password reset
 * land here instead of a real inbox.
 */
async function openLatestEmailLink(
  request: import("@playwright/test").APIRequestContext,
  email: string,
  page: import("@playwright/test").Page,
) {
  let messageId: string | undefined;

  // Delivery is asynchronous, so poll briefly rather than assuming it arrived.
  await expect
    .poll(
      async () => {
        const search = await request.get(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
        );
        const { messages } = (await search.json()) as { messages: { ID: string }[] };
        messageId = messages[0]?.ID;
        return messages.length;
      },
      { message: `expected an email for ${email}`, timeout: 15_000 },
    )
    .toBeGreaterThan(0);

  const detail = await request.get(`${MAILPIT}/api/v1/message/${messageId}`);
  const { HTML, Text } = (await detail.json()) as { HTML?: string; Text?: string };
  const content = HTML || Text || "";
  const link = content.match(/https?:\/\/[^\s"'<>]*(?:token_hash|token)=[^\s"'<>]*/)?.[0];
  expect(link, "email should contain an action link").toBeTruthy();

  // Clear the mailbox so the next poll in this test can't match a stale message.
  await request.delete(`${MAILPIT}/api/v1/messages`, { data: { IDs: [messageId] } });

  await page.goto(link!.replace(/&amp;/g, "&"));
  if (await page.evaluate(()=>Boolean(sessionStorage.getItem("r2w:onboarding"))) && /\/(dashboard|business)$/.test(new URL(page.url()).pathname)) {
    await page.getByRole("button",{name:"Tạm đóng thiết lập",exact:true}).click();
    await page.evaluate(()=>sessionStorage.removeItem("r2w:onboarding"));
  }
}

test.describe("sign-up and verification", () => {
  test("rejects a weak password before hitting the server", async ({ page }) => {
    await page.goto("/signup?type=candidate");
    await page.getByLabel("Họ và tên").fill("Weak Password");
    await page.getByLabel("Email").fill(uniqueEmail("weak"));
    await page.getByLabel("Mật khẩu (ít nhất 12 ký tự)").fill("short");
    await page.getByLabel("Xác nhận mật khẩu").fill("short");
    await page.getByLabel(/Tôi đồng ý với Điều khoản/i).check();
    await page.getByRole("button", { name: "Tạo tài khoản →" }).click();

    await expect(page.getByText("Password must be at least 12 characters", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("rejects mismatched password confirmation", async ({ page }) => {
    await page.goto("/signup?type=candidate");
    await page.getByLabel("Họ và tên").fill("Mismatch");
    await page.getByLabel("Email").fill(uniqueEmail("mismatch"));
    await page.getByLabel("Mật khẩu (ít nhất 12 ký tự)").fill(PASSWORD);
    await page.getByLabel("Xác nhận mật khẩu").fill(`${PASSWORD}-different`);
    await page.getByLabel(/Tôi đồng ý với Điều khoản/i).check();
    await page.getByRole("button", { name: "Tạo tài khoản →" }).click();

    await expect(page.getByText(/do not match/i)).toBeVisible();
  });

  test("requires accepting the terms", async ({ page }) => {
    await page.goto("/signup?type=candidate");
    await page.getByLabel("Họ và tên").fill("No Consent");
    await page.getByLabel("Email").fill(uniqueEmail("noconsent"));
    await page.getByLabel("Mật khẩu (ít nhất 12 ký tự)").fill(PASSWORD);
    await page.getByLabel("Xác nhận mật khẩu").fill(PASSWORD);
    await page.getByRole("button", { name: "Tạo tài khoản →" }).click();

    await expect(page.getByText(/must accept the terms/i)).toBeVisible();
  });

  test("signs up, verifies by email, and reaches the dashboard", async ({ page, request }) => {
    const email = uniqueEmail("happy");

    await page.goto("/signup?type=candidate");
    await page.getByLabel("Họ và tên").fill("Happy Path");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu (ít nhất 12 ký tự)").fill(PASSWORD);
    await page.getByLabel("Xác nhận mật khẩu").fill(PASSWORD);
    await page.getByLabel(/Tôi đồng ý với Điều khoản/i).check();
    await page.getByRole("button", { name: "Tạo tài khoản →" }).click();

    await expect(page).toHaveURL(/\/verify-email/);

    await openLatestEmailLink(request, email, page);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /Xin chào, Happy Path/ })).toBeVisible();
    // The account reaches the candidate workspace; DB integration tests verify the default role.
    await expect(page.getByRole("progressbar", { name: "Lộ trình AI" })).toBeVisible();
    if (process.env.CAPTURE_UI) await page.screenshot({ path: test.info().outputPath("dashboard.png"), fullPage:true });
    for (const route of ["/roadmap/cv", "/simulations", "/interviews", "/report"]) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await expect(page.locator("#workspace-content")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Chưa tải được dữ liệu" })).toHaveCount(0);
      if (route === "/simulations") {
        await expect(page.getByRole("heading", { name: "Bạn đang quan tâm đến lĩnh vực nào?" })).toBeVisible();
        await page.getByRole("button", { name: "Tiếp tục →", exact: true }).click();
        await expect(page.locator(".catalog-entry").first()).toBeVisible();
      }
      if (route === "/interviews") {
        await page.getByRole("button", { name: "PHỎNG VẤN NGAY", exact:true }).click();
        await expect(page.locator(".catalog-entry").first()).toBeVisible();
      }
      if (process.env.CAPTURE_UI) {
        await page.evaluate(async()=>{ document.documentElement.style.scrollBehavior="auto"; scrollTo(0,0); await Promise.all(Array.from(document.images).map(img=>img.decode().catch(()=>{}))); });
        await page.screenshot({ path:test.info().outputPath(route.replaceAll("/","-")+".png"), fullPage:true });
      }
      await page.setViewportSize({width:390,height:844});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth), route).toBe(true);
      await page.setViewportSize({width:1280,height:720});
    }
  });
});

test.describe("sign-in and sign-out", () => {
  test("rejects wrong credentials without revealing which field was wrong", async ({ page }) => {
    await page.goto("/signin");
    await page.getByLabel("Email").fill("nobody-here@example.com");
    await page.getByLabel("Mật khẩu").fill("WrongPassword-123");
    await page.getByRole("button", { name: "Đăng nhập →" }).click();

    await expect(page.getByText("Invalid email or password")).toBeVisible();
  });

  test("signs in a verified user, then signs out", async ({ page, request }) => {
    const email = uniqueEmail("session");

    await page.goto("/signup?type=candidate");
    await page.getByLabel("Họ và tên").fill("Session User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu (ít nhất 12 ký tự)").fill(PASSWORD);
    await page.getByLabel("Xác nhận mật khẩu").fill(PASSWORD);
    await page.getByLabel(/Tôi đồng ý với Điều khoản/i).check();
    await page.getByRole("button", { name: "Tạo tài khoản →" }).click();
    await openLatestEmailLink(request, email, page);
    await expect(page).toHaveURL(/\/dashboard/);

    await page.locator(".account-menu summary").click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/");

    // Session is gone: the dashboard should bounce back to sign-in.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/signin\?next=%2Fdashboard/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu").fill(PASSWORD);
    await page.getByRole("button", { name: "Đăng nhập →" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe("route protection", () => {
  test("redirects anonymous users to sign-in with a return path", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/signin\?next=%2Fdashboard/);
  });

  test("keeps public pages reachable while signed out", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Đăng ký", exact: true })).toBeVisible();
  });
});

test.describe("password reset", () => {
  test("always reports success, even for an unknown email", async ({ page }) => {
    await page.goto("/reset-password");
    await page.getByLabel("Email").fill("definitely-not-registered@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(page.getByRole("status")).toContainText(/if that email has an account/i);
  });

  test("resets the password via the emailed link and signs in with the new one", async ({
    page,
    request,
  }) => {
    const email = uniqueEmail("reset");
    const newPassword = "Ready2Work-Reset-2";

    await page.goto("/signup?type=candidate");
    await page.getByLabel("Họ và tên").fill("Reset User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu (ít nhất 12 ký tự)").fill(PASSWORD);
    await page.getByLabel("Xác nhận mật khẩu").fill(PASSWORD);
    await page.getByLabel(/Tôi đồng ý với Điều khoản/i).check();
    await page.getByRole("button", { name: "Tạo tài khoản →" }).click();
    await openLatestEmailLink(request, email, page);
    await page.locator(".account-menu summary").click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/reset-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status")).toBeVisible();

    await openLatestEmailLink(request, email, page);
    await expect(page).toHaveURL(/\/update-password/);

    await page.getByLabel("New password (at least 12 characters)").fill(newPassword);
    await page.getByLabel("Confirm new password").fill(newPassword);
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.locator(".account-menu summary").click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/");
    await page.goto("/signin");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu").fill(newPassword);
    await page.getByRole("button", { name: "Đăng nhập →" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test("candidate onboarding saves profile preferences through existing account permissions",async({page,request})=>{
 await page.setViewportSize({width:1440,height:960});
 const email=uniqueEmail("onboarding");
 await page.goto("/signup?type=candidate");
 await page.getByLabel("Họ và tên").fill("Onboarding User");
 await page.getByLabel("Email",{exact:true}).fill(email);
 await page.getByLabel("Mật khẩu (ít nhất 12 ký tự)").fill(PASSWORD);
 await page.getByLabel("Xác nhận mật khẩu").fill(PASSWORD);
 await page.getByLabel(/Tôi đồng ý với Điều khoản/i).check();
 await page.getByRole("button",{name:"Tạo tài khoản →"}).click();
 await openLatestEmailLink(request,email,page);
 await page.getByRole("button",{name:"Tiếp tục thiết lập →"}).click();
 const dialog=page.getByRole("dialog",{name:"Thiết lập tài khoản"});
 if(process.env.CAPTURE_UI)await page.screenshot({path:test.info().outputPath("onboarding-education.png"),animations:"disabled"});
 await dialog.getByLabel("Trường Đại học / Cao đẳng").fill("Đại học Kiểm thử");
 await dialog.getByLabel("Chuyên ngành học",{exact:true}).fill("Quản trị kinh doanh");
 await dialog.getByLabel("Bạn đang ở giai đoạn nào?").selectOption("Năm 4");
 await dialog.getByRole("button",{name:"Tiếp tục →",exact:true}).click();
 await dialog.getByRole("button",{name:"Marketing",exact:true}).click();
 await dialog.getByRole("button",{name:"Tiếp tục →",exact:true}).click();
 await dialog.getByRole("button",{name:"Đang tìm hiểu",exact:true}).click();
 await dialog.getByRole("button",{name:"Bỏ qua CV, tiếp tục →",exact:true}).click();
 await expect(dialog.getByRole("heading",{name:"Bạn chưa tải CV lên"})).toBeVisible();
 await dialog.getByRole("button",{name:"Tiếp tục →",exact:true}).click();
 await expect(dialog.getByRole("heading",{name:/Chào mừng bạn đến với/})).toBeVisible();
 if(process.env.CAPTURE_UI)await page.screenshot({path:test.info().outputPath("onboarding-welcome.png"),animations:"disabled"});
 await dialog.getByRole("button",{name:"Bắt đầu hành trình →",exact:true}).click();
 await expect(dialog).not.toBeVisible();
 await expect(page.getByRole("button",{name:"Tiếp tục thiết lập →"})).toHaveCount(0);
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
 const login=await client.auth.signInWithPassword({email,password:PASSWORD});expect(login.error).toBeNull();
 expect(login.data.user?.user_metadata.onboarding_preferences.educationStage).toBe("Năm 4");
 const profile=await client.from("profiles").select("university,major,graduation_year,onboarding_status").eq("id",login.data.user!.id).single();expect(profile.data).toMatchObject({university:"Đại học Kiểm thử",major:"Quản trị kinh doanh",graduation_year:null,onboarding_status:"completed"});
 const roles=await client.from("user_roles").select("role").eq("user_id",login.data.user!.id);expect(roles.data?.map(r=>r.role)).not.toContain("admin");

});

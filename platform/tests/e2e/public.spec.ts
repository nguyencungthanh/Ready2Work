import { expect, test } from "@playwright/test";

test("public landing renders on desktop and mobile without horizontal overflow", async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Trải nghiệm công việc thật");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("auth screens preserve the original form contract and validation", async ({ page }) => {
  await page.goto("/signin");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Đăng nhập →", exact: true })).toBeVisible();
  await page.goto("/signup?type=candidate");
  await page.getByLabel("Họ và tên").fill("Validation Test");
  await page.getByLabel("Email").fill("validation@example.test");
  await page.getByLabel("Mật khẩu (ít nhất 12 ký tự)").fill("short");
  await page.getByLabel("Xác nhận mật khẩu").fill("short");
  await page.getByLabel(/Tôi đồng ý với Điều khoản/i).check();
  await page.getByRole("button", { name: "Tạo tài khoản →", exact: true }).click();
  await expect(page.getByText("Password must be at least 12 characters", { exact: true })).toBeVisible();
});

for (const route of ["/dashboard", "/roadmap/cv", "/report", "/business", "/mentor"]) {
  test(`signed-out access to ${route} redirects to sign-in`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/\/signin(?:\?|$)/);
  });
}


test("business signup keeps a separate onboarding intent", async ({ page }) => {
  await page.goto("/signup?type=business");
  await expect(page.getByLabel("Email công ty")).toBeVisible();
  await expect(page.locator('input[name="accountType"]')).toHaveValue("business");
  await expect(page.getByRole("button", { name: "Tạo tài khoản →", exact: true })).toBeVisible();
});

test("registration opens the reference role selector before the account form", async ({page})=>{
 await page.setViewportSize({width:1440,height:960});
 await page.goto("/signup");
 await expect(page.getByRole("heading",{name:"Bạn là ai?"})).toBeVisible();
 if(process.env.CAPTURE_UI)await page.screenshot({path:test.info().outputPath("signup-role.png"),animations:"disabled"});
 await page.getByRole("button",{name:"Bắt đầu — Tôi là Sinh viên"}).click();
 await expect(page.getByRole("heading",{name:"Tạo tài khoản miễn phí"})).toBeVisible();
 await expect(page.getByLabel("Họ và tên")).toBeVisible();
 if(process.env.CAPTURE_UI)await page.screenshot({path:test.info().outputPath("signup-form.png"),animations:"disabled"});
 await expect(page.getByRole("button",{name:"G · Đăng ký bằng Google"})).toBeDisabled();
});

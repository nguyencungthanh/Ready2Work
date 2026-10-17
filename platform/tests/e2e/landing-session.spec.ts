import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const localDatabase = /^http:\/\/(localhost|127\.0\.0\.1):54321\/?$/.test(url);
const localWebsite = /^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?\/?$/.test(process.env.E2E_BASE_URL || "http://localhost:3000");
const secret = process.env.SUPABASE_SECRET_KEY;
const sections = [
  { link: "Sứ mệnh", id: "mission", heading: "Sứ mệnh của chúng tôi" },
  { link: "Cộng đồng", id: "mentor", heading: "Kết nối cộng đồng Mentor" },
] as const;

async function expectGuestNavigation(page: Page) {
  const header = page.locator(".reference-landing > nav");
  await expect(header.getByRole("link", { name: "Đăng nhập", exact: true })).toBeVisible();
  await expect(header.getByRole("link", { name: "Đăng ký", exact: true })).toBeVisible();
  await expect(page.locator(".account-menu")).toHaveCount(0);
  await expect(page.locator('nav[aria-label="Không gian nghề nghiệp"]')).toHaveCount(0);
}
async function expectUsableSignedInLanding(page: Page, width: number, section: typeof sections[number]) {
  await expect(page).toHaveURL(new RegExp(`/#${section.id}$`));
  const header = page.locator("header.app-navigation");
  await expect(header).toBeVisible();
  await expect(page.locator('nav[aria-label="Không gian nghề nghiệp"]')).toHaveCount(1);
  await expect(page.locator(".reference-landing > nav")).toHaveCount(0);
  await expect(page.locator('a[href="/signin"], a[href="/signup"]')).toHaveCount(0);
  if (width > 900) {
    await expect(page.getByRole("navigation", { name: "Không gian nghề nghiệp", exact: true })).toBeVisible();
    await expect(header.locator(".dn-uname")).toHaveText("Kiểm định phiên trang chủ");
  }
  const heading = page.locator(`#${section.id}`).getByRole("heading", { name: section.heading, exact: true });
  await expect(heading).toBeInViewport();
  const headerBounds = await header.boundingBox();
  expect(headerBounds).not.toBeNull();
  await expect.poll(async () => (await heading.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(Math.floor(headerBounds!.y + headerBounds!.height) - 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await header.locator(".account-menu > summary").click();
  await expect(header.getByRole("button", { name: "Đăng xuất", exact: true })).toBeVisible();
  await header.locator(".account-menu > summary").click();
}

test("footer mission and community preserve the signed-in workspace until a real sign-out", async ({ page, browser }) => {
  test.skip(!localDatabase || !localWebsite || !secret, "Chỉ tạo fixture và kiểm phiên trên website/Supabase local.");
  test.setTimeout(60_000);
  const admin = createClient(url, secret!, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `landing-session-${randomUUID()}@example.com`;
  const password = `Ready2Work-${randomUUID()}`;
  let userId: string | undefined;
  try {
    // Populate the public landing first, so the same URL is exercised in both session states.
    await page.goto("/#mission");
    await expectGuestNavigation(page);
    await expect(page.locator("#mission").getByRole("heading", { name: sections[0].heading, exact: true })).toBeInViewport();
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: "Kiểm định phiên trang chủ" } });
    expect(created.error).toBeNull();
    userId = created.data.user!.id;
    expect((await admin.from("profiles").update({ onboarding_status: "completed" }).eq("id", userId)).error).toBeNull();
    await page.goto("/signin");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Đăng nhập →", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
      for (const section of sections) {
        await page.goto("/dashboard");
        await page.getByRole("contentinfo").getByRole("link", { name: section.link, exact: true }).click();
        await expectUsableSignedInLanding(page, width, section);
        await page.reload();
        await expectUsableSignedInLanding(page, width, section);
        if (process.env.CAPTURE_UI) await page.screenshot({ path: test.info().outputPath(`signed-in-${section.id}-${width}.png`), animations: "disabled" });
        if (width > 900) {
          await page.getByRole("navigation", { name: "Không gian nghề nghiệp", exact: true }).getByRole("link", { name: "Tổng quan", exact: true }).click();
        } else {
          const start = page.getByRole("link", { name: /^BẮT ĐẦU\s*→$/ });
          await expect(start).toHaveAttribute("href", "/dashboard");
          await start.click();
        }
        await expect(page).toHaveURL(/\/dashboard$/);
        await expect(page.getByRole("heading", { name: "Xin chào, Kiểm định phiên trang chủ", exact: true })).toBeVisible();
      }
    }

    // A second browser must still receive guest markup while this user's cookie remains valid.
    const guest = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
      const anonymous = await guest.newPage();
      await anonymous.goto(new URL("/#mentor", page.url()).href);
      await expectGuestNavigation(anonymous);
      await expect(anonymous.getByText("Kiểm định phiên trang chủ", { exact: true })).toHaveCount(0);
      await expect(anonymous.locator("#mentor").getByRole("heading", { name: sections[1].heading, exact: true })).toBeInViewport();
      expect(await anonymous.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    } finally { await guest.close(); }

    await page.locator(".account-menu > summary").click();
    await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
    await expect(page).toHaveURL("/");
    await expectGuestNavigation(page);
    for (const section of sections) {
      await page.goto(`/#${section.id}`);
      await page.reload();
      await expectGuestNavigation(page);
      await expect(page.locator(`#${section.id}`).getByRole("heading", { name: section.heading, exact: true })).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/signin\?next=%2Fdashboard/);
  } finally {
    if (userId) expect((await admin.auth.admin.deleteUser(userId)).error).toBeNull();
  }
});

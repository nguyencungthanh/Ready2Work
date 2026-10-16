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
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Validation Test");
  await page.getByLabel("Email").fill("validation@example.test");
  await page.getByLabel("Password (at least 12 characters)").fill("short");
  await page.getByLabel("Confirm password").fill("short");
  await page.getByLabel(/accept the terms/i).check();
  await page.getByRole("button", { name: "Create account", exact: true }).click();
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
  await expect(page.getByRole("button", { name: "Create account", exact: true })).toBeVisible();
});

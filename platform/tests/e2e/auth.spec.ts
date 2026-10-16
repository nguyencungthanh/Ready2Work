import { expect, test } from "@playwright/test";

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
}

test.describe("sign-up and verification", () => {
  test("rejects a weak password before hitting the server", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Weak Password");
    await page.getByLabel("Email").fill(uniqueEmail("weak"));
    await page.getByLabel("Password (at least 12 characters)").fill("short");
    await page.getByLabel("Confirm password").fill("short");
    await page.getByLabel(/accept the terms/i).check();
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText(/at least 12 characters/i)).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("rejects mismatched password confirmation", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Mismatch");
    await page.getByLabel("Email").fill(uniqueEmail("mismatch"));
    await page.getByLabel("Password (at least 12 characters)").fill(PASSWORD);
    await page.getByLabel("Confirm password").fill(`${PASSWORD}-different`);
    await page.getByLabel(/accept the terms/i).check();
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText(/do not match/i)).toBeVisible();
  });

  test("requires accepting the terms", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("No Consent");
    await page.getByLabel("Email").fill(uniqueEmail("noconsent"));
    await page.getByLabel("Password (at least 12 characters)").fill(PASSWORD);
    await page.getByLabel("Confirm password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText(/must accept the terms/i)).toBeVisible();
  });

  test("signs up, verifies by email, and reaches the dashboard", async ({ page, request }) => {
    const email = uniqueEmail("happy");

    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Happy Path");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password (at least 12 characters)").fill(PASSWORD);
    await page.getByLabel("Confirm password").fill(PASSWORD);
    await page.getByLabel(/accept the terms/i).check();
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/verify-email/);

    await openLatestEmailLink(request, email, page);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /Welcome, Happy Path/ })).toBeVisible();
    // The account reaches the candidate workspace; DB integration tests verify the default role.
    await expect(page.getByRole("progressbar", { name: "Lộ trình AI" })).toBeVisible();
    for (const route of ["/roadmap/cv", "/simulations", "/interviews", "/report"]) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await expect(page.locator("#workspace-content")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Chưa tải được dữ liệu" })).toHaveCount(0);
    }
  });
});

test.describe("sign-in and sign-out", () => {
  test("rejects wrong credentials without revealing which field was wrong", async ({ page }) => {
    await page.goto("/signin");
    await page.getByLabel("Email").fill("nobody-here@example.com");
    await page.getByLabel("Password").fill("WrongPassword-123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Invalid email or password")).toBeVisible();
  });

  test("signs in a verified user, then signs out", async ({ page, request }) => {
    const email = uniqueEmail("session");

    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Session User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password (at least 12 characters)").fill(PASSWORD);
    await page.getByLabel("Confirm password").fill(PASSWORD);
    await page.getByLabel(/accept the terms/i).check();
    await page.getByRole("button", { name: "Create account" }).click();
    await openLatestEmailLink(request, email, page);
    await expect(page).toHaveURL(/\/dashboard/);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/");

    // Session is gone: the dashboard should bounce back to sign-in.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/signin\?next=%2Fdashboard/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
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

    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Reset User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password (at least 12 characters)").fill(PASSWORD);
    await page.getByLabel("Confirm password").fill(PASSWORD);
    await page.getByLabel(/accept the terms/i).check();
    await page.getByRole("button", { name: "Create account" }).click();
    await openLatestEmailLink(request, email, page);
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

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/");
    await page.goto("/signin");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(newPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

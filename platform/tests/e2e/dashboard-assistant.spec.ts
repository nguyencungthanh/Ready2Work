import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const local = /^http:\/\/(localhost|127\.0\.0\.1):54321\/?$/.test(url);
const secret = process.env.SUPABASE_SECRET_KEY;

test("candidate saves their city and chats in the dashboard with recoverable API errors", async ({ page }) => {
  test.skip(!local || !secret, "Chỉ tạo fixture trong Supabase local.");
  test.setTimeout(90_000);
  const admin = createClient(url, secret!, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `assistant-${randomUUID()}@example.com`;
  const password = `Ready2Work-${randomUUID()}`;
  let userId: string | undefined;
  try {
    await page.setViewportSize({ width: 1440, height: 960 });
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: "Kiểm thử trợ lý" } });
    expect(created.error).toBeNull();
    userId = created.data.user!.id;
    await page.goto("/signin");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Đăng nhập →", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.getByRole("button", { name: "Tiếp tục thiết lập →", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Thiết lập tài khoản" });
    const city = dialog.getByLabel("Tỉnh/thành phố nơi bạn đang sinh sống", { exact: true });
    await dialog.getByLabel("Trường Đại học / Cao đẳng", { exact: true }).fill("Đại học Kiểm thử");
    await dialog.getByLabel("Chuyên ngành học", { exact: true }).fill("Công nghệ thông tin");
    await dialog.getByRole("button", { name: "Tiếp tục →", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText(/tỉnh|thành phố/i);
    await expect(city).toBeVisible();
    await expect(city).toHaveAttribute("maxlength", "200");
    await city.fill("Hà Nội");
    if (process.env.CAPTURE_UI) {
      await page.setViewportSize({ width: 390, height: 844 });
      await city.scrollIntoViewIfNeeded();
      const cityBounds = await city.boundingBox();
      expect(cityBounds).not.toBeNull();
      expect(cityBounds!.x).toBeGreaterThanOrEqual(0);
      expect(cityBounds!.x + cityBounds!.width).toBeLessThanOrEqual(391);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath("onboarding-city-mobile.png") });
      await dialog.getByRole("button", { name: "Tiếp tục →", exact: true }).scrollIntoViewIfNeeded();
      await expect(dialog.getByRole("button", { name: "Tiếp tục →", exact: true })).toBeInViewport();
      await page.setViewportSize({ width: 1440, height: 960 });
    }
    await page.reload();
    await page.getByRole("button", { name: "Tiếp tục thiết lập →", exact: true }).click();
    await expect(city).toHaveValue("Hà Nội");
    await expect(dialog.getByLabel("Trường Đại học / Cao đẳng", { exact: true })).toHaveValue("Đại học Kiểm thử");
    await dialog.getByRole("button", { name: "Tiếp tục →", exact: true }).click();
    await dialog.getByRole("button", { name: "Công nghệ thông tin", exact: true }).click();
    await dialog.getByRole("button", { name: "Tiếp tục →", exact: true }).click();
    await dialog.getByRole("button", { name: "Bỏ qua CV, tiếp tục →", exact: true }).click();
    await dialog.getByRole("button", { name: "Tiếp tục →", exact: true }).click();
    await expect(dialog.getByRole("heading", { name: /Chào mừng bạn đến với/ })).toBeVisible();
    await dialog.getByRole("button", { name: "Bắt đầu hành trình →", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    const saved = await admin.from("profiles").select("university, major, city, onboarding_status").eq("id", userId).single();
    expect(saved.error).toBeNull();
    expect(saved.data).toMatchObject({ university: "Đại học Kiểm thử", major: "Công nghệ thông tin", city: "Hà Nội", onboarding_status: "completed" });
    const account = await admin.auth.admin.getUserById(userId);
    expect(account.error).toBeNull();
    expect(account.data.user?.user_metadata.onboarding_preferences.city).toBe("Hà Nội");

    // Only this HTTP boundary is mocked: no prompt, account data or key is sent to Gemini.
    const requests: { messages: { role: string; text: string }[] }[] = [];
    const firstReply = "Bạn có thể bắt đầu bằng việc giải thích một lỗi phần mềm bạn từng gặp.";
    const retryReply = "Hãy viết một báo cáo lỗi gồm bước tái hiện, kết quả mong đợi và thực tế.";
    await page.route("**/api/assistant", async (route) => {
      requests.push(route.request().postDataJSON());
      if (requests.length === 2) {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "AI đang bận. Nội dung của bạn vẫn được giữ, hãy thử lại.", code: "AI_UNAVAILABLE" }) });
      } else {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ reply: requests.length === 1 ? firstReply : retryReply }) });
      }
    });
    const input = page.getByRole("textbox", { name: "Tin nhắn cho R2W AI", exact: true });
    const log = page.getByRole("log", { name: "Cuộc trò chuyện với R2W AI", exact: true });
    await input.fill("Tôi nên chuẩn bị gì cho phỏng vấn?");
    await input.press("Shift+Enter");
    await page.keyboard.insertText("Tôi quan tâm QA.");
    const firstQuestion = "Tôi nên chuẩn bị gì cho phỏng vấn?\nTôi quan tâm QA.";
    await expect(input).toHaveValue(firstQuestion);
    expect(requests).toHaveLength(0);
    await input.press("Enter");
    await expect(log).toContainText(firstReply);
    expect(requests[0]).toEqual({ messages: [{ role: "user", text: firstQuestion }] });
    await expect(page).toHaveURL(/\/dashboard/);

    const secondQuestion = "Hãy cho tôi một bước cụ thể.";
    await input.fill(secondQuestion);
    await page.getByRole("button", { name: "Gửi tin nhắn", exact: true }).click();
    await expect(page.locator(".d-ai-box").getByRole("alert")).toContainText("AI đang bận");
    await expect(input).toHaveValue(secondQuestion);
    const expectedHistory = { messages: [{ role: "user", text: firstQuestion }, { role: "model", text: firstReply }, { role: "user", text: secondQuestion }] };
    expect(requests[1]).toEqual(expectedHistory);
    await page.getByRole("button", { name: "Thử gửi lại", exact: true }).click();
    await expect(log).toContainText(retryReply);
    expect(requests).toHaveLength(3);
    expect(requests[2]).toEqual(expectedHistory);
    await expect(input).toHaveValue("");
    await expect(page).toHaveURL(/\/dashboard/);
    // Continue beyond the API history window: the UI must send bounded, alternating history.
    for (let turn = 3; turn <= 7; turn++) {
      await input.fill(`Câu hỏi kiểm định lượt ${turn}.`);
      await page.getByRole("button", { name: "Gửi tin nhắn", exact: true }).click();
      await expect(input).toHaveValue("");
    }
    expect(requests).toHaveLength(8);
    const lastHistory = requests.at(-1)!.messages;
    expect(lastHistory).toHaveLength(11);
    expect(lastHistory[0]).toEqual({ role: "user", text: secondQuestion });
    expect(lastHistory.at(-1)).toEqual({ role: "user", text: "Câu hỏi kiểm định lượt 7." });
    expect(lastHistory.every((message, index) => message.role === (index % 2 ? "model" : "user"))).toBe(true);
    if (process.env.CAPTURE_UI) {
      const card = page.locator(".d-ai-box");
      await card.screenshot({ path: test.info().outputPath("dashboard-assistant-desktop.png") });
      await page.setViewportSize({ width: 390, height: 844 });
      await card.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -96));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const bounds = await card.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
      await card.screenshot({ path: test.info().outputPath("dashboard-assistant-mobile.png") });
    }
  } finally {
    if (userId) expect((await admin.auth.admin.deleteUser(userId)).error).toBeNull();
  }
});

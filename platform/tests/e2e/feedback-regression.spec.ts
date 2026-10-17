import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const local = /^http:\/\/(localhost|127\.0\.0\.1):54321\/?$/.test(url);
const secret = process.env.SUPABASE_SECRET_KEY;

test("feedback: returning login, source catalogs, question draft, editable tables and document import", async ({ page }) => {
  test.skip(!local || !secret, "Chỉ tạo fixture trong Supabase local.");
  test.setTimeout(90_000);
  const admin = createClient(url, secret!, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `feedback-${randomUUID()}@example.com`;
  const password = `Ready2Work-${randomUUID()}`;
  let userId: string | undefined;
  try {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: "Kiểm định feedback" } });
    expect(created.error).toBeNull();
    userId = created.data.user!.id;
    expect((await admin.from("profiles").update({ onboarding_status: "completed" }).eq("id", userId)).error).toBeNull();
    await page.goto("/signin");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Đăng nhập →", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/interviews?explore=1");
    await page.getByRole("button", { name: "Công nghệ thông tin", exact: true }).click();
    await expect(page.locator(".iv-pos-card")).toHaveCount(3);
    expect((await page.locator(".iv-pos-title").allTextContents()).sort()).toEqual(["Business Analyst", "Data Analyst", "Software Tester/QA"]);
    await page.getByRole("button", { name: "Tài chính - Ngân hàng", exact: true }).click();
    await expect(page.locator(".iv-pos-card")).toHaveCount(3);
    const financeTitles = await page.locator(".iv-pos-title").allTextContents();
    expect([...financeTitles].sort()).toEqual(["Credit Analyst", "Financial Analyst", "Risk Analyst"]);

    const set = await admin.from("interview_sets").select("id").eq("position_id", "IT-02").eq("is_available", true).like("slug", "r2w-%").order("created_at", { ascending: false }).limit(1).single();
    expect(set.error).toBeNull();
    const questions = await admin.from("interview_questions").select("id").eq("set_id", set.data!.id).order("round_number").order("position");
    expect(questions.error).toBeNull();
    expect(questions.data).toHaveLength(8);
    const session = await admin.from("interview_sessions").insert({ user_id: userId, set_id: set.data!.id }).select("id").single();
    expect(session.error).toBeNull();
    // The zero grade is a local render fixture; it does not claim a provider evaluation occurred.
    const firstAnswer = await admin.from("interview_answers").insert({ session_id: session.data!.id, question_id: questions.data![0]!.id, answer_text: "Bản ghi kiểm định giao diện, chưa gọi AI.", score: 0, criteria: [] });
    expect(firstAnswer.error).toBeNull();
    await page.goto(`/interviews/sessions/${session.data!.id}`);
    await expect(page.getByRole("heading", { name: /phân biệt Testing và Quality Assurance/ })).toBeVisible();
    const answer = "Reactive/Proactive, Quality Assurance/Quality Control.";
    await page.getByRole("textbox", { name: "Câu trả lời", exact: true }).fill(answer);
    await page.getByRole("tab", { name: "Trả lời bằng Giọng nói" }).click();
    await page.getByRole("tab", { name: "Trả lời bằng Văn bản" }).click();
    await expect(page.getByRole("textbox", { name: "Câu trả lời", exact: true })).toHaveValue(answer);
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Câu trả lời", exact: true })).toHaveValue(answer);
    await expect(page.locator('input[name="answerText"]')).toHaveValue(answer);
    await expect(page.getByRole("button", { name: /Chốt câu trả lời/ })).toBeEnabled();
    await page.locator(".account-menu > summary").click();
    await page.getByRole("button", { name: /^(Đăng xuất|Sign out)$/ }).click();
    await expect(page).toHaveURL("/");
    await page.goto("/signin");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Đăng nhập →", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    const history = await admin.from("interview_answers").select("question_id").eq("session_id", session.data!.id);
    expect(history.error).toBeNull();
    expect(history.data?.map((row) => row.question_id)).toEqual([questions.data![0]!.id]);

    const simulation = await admin.from("simulations").select("id,slug,is_available").eq("position_id", "TCNH-01").eq("slug", "r2w-tcnh-01").single();
    expect(simulation.error).toBeNull();
    await page.goto(`/simulations/${simulation.data!.slug}`);
    if (simulation.data!.is_available) {
      await page.getByRole("button", { name: "Nhận việc & Bắt đầu tính giờ", exact: true }).click();
      await expect(page).toHaveURL(/attempt=/);
    } else {
      await page.getByRole("link", { name: "Xem nội dung và soạn thử", exact: true }).click();
      await expect(page).toHaveURL(/preview=1/);
      await expect(page.getByRole("button", { name: "Chờ xác nhận tiêu chí", exact: true })).toBeDisabled();
      await expect(page.getByText("Soạn thử · Chưa tính thời gian", { exact: true })).toBeVisible();
    }
    await page.getByRole("button", { name: "Tab 2 Tài liệu tham khảo", exact: true }).click();
    await expect(page.locator(".panel-content pre")).toHaveCount(0);
    expect(await page.locator(".panel-content img, .panel-content table, .panel-content iframe").count()).toBeGreaterThan(0);
    await expect(page.locator(".panel-content")).not.toContainText('"artifact_id"');

    const sourceCell = page.getByRole("textbox", { name: "Bảng Thẩm định, hàng 1, Quý 1", exact: true });
    await sourceCell.fill("40,0%");
    await page.getByRole("button", { name: "Thêm bảng", exact: true }).click();
    const rowLabel = page.getByRole("textbox", { name: /^Bảng \d+, hàng 1, Chỉ tiêu$/ });
    const rowValue = page.getByRole("textbox", { name: /^Bảng \d+, hàng 1, Kết quả$/ });
    await rowLabel.fill("Biên lợi nhuận");
    await rowValue.fill("20%");
    await expect(page.locator('input[name="content"]')).toHaveValue(/Biên lợi nhuận \| 20%/);
    await page.reload();
    await expect(sourceCell).toHaveValue("40,0%");
    await expect(rowLabel).toHaveValue("Biên lợi nhuận");
    await expect(rowValue).toHaveValue("20%");
    await page.getByRole("button", { name: "Thêm hàng", exact: true }).click();
    await expect(page.getByRole("textbox", { name: /^Bảng \d+, hàng 3, Chỉ tiêu$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tải tài liệu bài làm", exact: true })).toBeInViewport();
    const imported = "Nội dung tài liệu thử: kiểm tra dòng tiền trước khi kết luận.";
    await page.getByLabel("Tài liệu bài làm", { exact: true }).setInputFiles({ name: "bai-lam-kiem-dinh.txt", mimeType: "text/plain", buffer: Buffer.from(imported) });
    await expect(page.getByRole("textbox", { name: "Nội dung bài làm", exact: true })).toContainText(imported);
    await expect(page.locator('input[name="content"]')).toHaveValue(/Nội dung tài liệu thử/);
    await expect(page.locator('input[name="content"]')).toHaveValue(/Biên lợi nhuận \| 20%/);
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Nội dung bài làm", exact: true })).toContainText(imported);
    await expect(rowValue).toHaveValue("20%");
    if (!simulation.data!.is_available) {
      const attempts = await admin.from("simulation_attempts").select("id").eq("user_id", userId).eq("simulation_id", simulation.data!.id);
      expect(attempts.error).toBeNull();
      expect(attempts.data).toEqual([]);
      await expect(page.getByRole("button", { name: "Chờ xác nhận tiêu chí", exact: true })).toBeDisabled();
    }
    if (process.env.CAPTURE_UI) await page.screenshot({ path: test.info().outputPath("feedback-simulation-draft.png"), fullPage: true });
  } finally {
    if (userId) expect((await admin.auth.admin.deleteUser(userId)).error).toBeNull();
  }
});

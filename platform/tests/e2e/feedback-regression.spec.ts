import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import taskSource from "../../data/task-rubrics.json";
import interviewSource from "../../data/interview-bank.json";

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

    await page.goto("/simulations");
    await expect(page.locator(".category-card")).toHaveCount(5);
    const simulationLinks: string[] = [];
    for (const industry of taskSource.industries) {
      expect(industry.tasks).toHaveLength(3);
      await page.goto(`/simulations?industry=${encodeURIComponent(industry.industry_name)}`);
      await expect(page.locator(".job-card")).toHaveCount(3);
      const links = await page.locator(".job-card .catalog-entry").evaluateAll((entries) => entries.map((entry) => entry.getAttribute("href")!));
      expect(links.sort()).toEqual(industry.tasks.map((task) => `/simulations/r2w-${task.position_id.toLowerCase()}`).sort());
      simulationLinks.push(...links);
    }
    expect(new Set(simulationLinks).size).toBe(15);

    await page.goto("/interviews?explore=1");
    await expect(page.locator(".iv-pos-card")).toHaveCount(15);
    const sourceSets = Object.entries(interviewSource);
    for (const industry of taskSource.industries) {
      await page.getByRole("button", { name: industry.industry_name, exact: true }).click();
      await expect(page.locator(".iv-pos-card")).toHaveCount(3);
      const expected = sourceSets.filter(([, set]) => set.industryId === industry.industry_id);
      expect(expected).toHaveLength(3);
      const links = await page.locator(".iv-pos-card").evaluateAll((entries) => entries.map((entry) => entry.getAttribute("href")!));
      expect(links.sort()).toEqual(expected.map(([slug, set]) => `/interviews/r2w-${slug}-${set.contentVersion}`).sort());
    }
    await page.getByRole("button", { name: "Tất cả", exact: true }).click();
    await page.getByRole("tab", { name: "Từ doanh nghiệp", exact: true }).click();
    for (const slug of ["big4-audit-round1", "3pl-operations-round1", "fmcg-brand-round1"]) {
      await expect(page.locator(`a[href="/interviews/${slug}"]`)).toHaveCount(0);
    }
    const companyLinks = await page.locator(".iv-company-card").evaluateAll((entries) => entries.map((entry) => entry.getAttribute("href")!));
    for (const link of companyLinks) expect(link).toMatch(/^\/interviews\/company-[0-9a-f-]{36}$/i);

    await page.goto("/simulations/r2w-it-03");
    await page.getByRole("button", { name: "Tài liệu tham khảo", exact: true }).click();
    const coffeeTable = page.locator(".waiting-body table");
    await expect(coffeeTable).toHaveCount(1);
    await expect(coffeeTable.locator("th")).toHaveText(["Chi nhánh", "Tháng 5 (đơn/ doanh thu)", "Tháng 6", "Tháng 7", "Tháng 8"]);
    await expect(coffeeTable.locator("tbody tr")).toHaveCount(4);
    await expect(coffeeTable.locator("tbody tr").first().locator("td")).toHaveText(["Q1", "420 đơn / 21.0tr", "460 đơn / 23.0tr", "510 đơn / 25.5tr", "560 đơn / 28.0tr"]);
    await expect(page.locator(".waiting-body")).not.toContainText("+33.33%");
    await expect(page.locator(".waiting-body")).not.toContainText("benchmark_table");
    await expect(page.locator('a[href$="/14.png"], a[href$="/20.png"], img[src$="/14.png"], img[src$="/20.png"]')).toHaveCount(0);

    for (const position of ["mkt-01", "mkt-03"]) {
      await page.goto(`/simulations/r2w-${position}`);
      await expect(page.getByRole("button", { name: "Nhận việc & Bắt đầu tính giờ", exact: true })).toBeEnabled();
      await page.getByRole("button", { name: "Tài liệu tham khảo", exact: true }).click();
      expect(await page.locator(".waiting-body table").count()).toBeGreaterThanOrEqual(2);
      await expect(page.locator(".waiting-body")).toContainText("Dữ liệu mô phỏng");
      if (position === "mkt-03") {
        const keywords = page.locator(".waiting-body section").filter({ has: page.getByRole("heading", { name: "Bảng 12 từ khóa SEO · Dữ liệu mô phỏng", exact: true }) });
        await expect(keywords.locator("tbody tr")).toHaveCount(12);
      }
      await page.getByRole("button", { name: "Nhận việc & Bắt đầu tính giờ", exact: true }).click();
      await expect(page.getByRole("button", { name: "Nộp báo cáo", exact: true })).toBeDisabled();
      const draft = page.getByRole("textbox", { name: "Nội dung bài làm", exact: true });
      await draft.fill("Bản nháp kiểm định nội dung nguồn, chưa gửi AI.");
      await page.reload();
      await expect(draft).toContainText("Bản nháp kiểm định nội dung nguồn, chưa gửi AI.");
      const marketingSimulation = await admin.from("simulations").select("id").eq("slug", `r2w-${position}`).single();
      expect(marketingSimulation.error).toBeNull();
      const attempts = await admin.from("simulation_attempts").select("id").eq("user_id", userId).eq("simulation_id", marketingSimulation.data!.id);
      expect(attempts.error).toBeNull();
      expect(attempts.data).toHaveLength(1);
    }

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
      expect(attempts.data).toHaveLength(1);
      await expect(page.getByRole("button", { name: "Chờ xác nhận tiêu chí", exact: true })).toBeDisabled();
    }
    if (process.env.CAPTURE_UI) await page.screenshot({ path: test.info().outputPath("feedback-simulation-draft.png"), fullPage: true });
  } finally {
    if (userId) expect((await admin.auth.admin.deleteUser(userId)).error).toBeNull();
  }
});

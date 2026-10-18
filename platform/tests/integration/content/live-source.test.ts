import { expect, test } from "vitest";
import tasks from "@/data/task-rubrics.json";
import { evaluateCurrentSource } from "@/lib/simulation/source-evaluator";

// Explicit opt-in: approved project source and a synthetic answer only. No database writes.
test.skipIf(process.env.R2W_RUN_LIVE_SOURCE !== "1")("grades the actual source rubric with its original image and a synthetic answer", async () => {
  const task = tasks.industries.find((industry) => industry.industry_id === "IT")!.tasks.find((item) => item.position_id === "IT-01")!;
  const answer = "Em sẽ thu thập yêu cầu từ nhân viên trung tâm, học viên và giảng viên. Cần thống nhất ai nhập dữ liệu và ai xem được dữ liệu. Em chưa phân tích chi tiết các nghiệp vụ, chưa lập bảng câu hỏi hoặc xác định tiêu chí nghiệm thu.";
  try {
    const result = await evaluateCurrentSource(answer, task.context, task.requirements.join("\n\n"), task, 600);
    expect(result.criteria.map((criterion) => criterion.criterionId).sort()).toEqual(task.rubric.map((criterion) => criterion.criterion_id).sort());
    for (const criterion of result.criteria) {
      const source = task.rubric.find((item) => item.criterion_id === criterion.criterionId)!;
      expect(criterion.label).toBe(source.criterion_name);
      expect(criterion.maxScore).toBe(source.max_points);
      expect(criterion.score).toBeGreaterThanOrEqual(0);
      expect(criterion.score).toBeLessThanOrEqual(source.max_points);
      expect(criterion.feedback?.trim().length).toBeGreaterThan(0);
    }
    console.info(JSON.stringify({ provider: "gemini", positionId: task.position_id, syntheticAnswer: true, criteria: result.criteria.length, score: result.overallScore, validated: true, databaseWrites: 0 }));
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error ? error.status : "validation_or_network";
    throw new Error(`Live source grading stopped (${status}); no account data was sent or saved.`);
  }
}, 110_000);

// The owner authorized project inputs and synthetic submissions. No account writes.
test.skipIf(process.env.R2W_RUN_LIVE_SOURCE !== "1").each(process.env.R2W_SOURCE_POSITION === "MKT-02" ? ["MKT-02"] : ["MKT-02", "TCNH-02"])("grades refreshed %s source using bounded, evidence-grounded awards", async (id) => {
  const task = tasks.industries.map((industry) => industry.tasks).flat().find((item) => item.position_id === id)!;
  const answer = id === "MKT-02"
    ? "Nhóm A chi 3.000.000 đồng cho 3 lead, nên CPL là 1.000.000 đồng. Nhóm B chi 2.000.000 đồng cho 5 lead nên CPL là 400.000 đồng. Em chưa phân tích trang đích, chưa đề xuất A/B test và chưa lập bảng ngân sách."
    : "Em ghi nhận doanh nghiệp đang xin vay trung hạn 5 tỷ đồng. Em chưa tính các chỉ số tài chính, chưa đánh giá nguồn trả nợ và chưa đưa ra quyết định tín dụng hoặc điều kiện cấp tín dụng.";
  try {
    const result = await evaluateCurrentSource(answer, task.context, task.requirements.join("\n\n"), task, 600);
    console.info(JSON.stringify({ check: "refreshed-source-grading", positionId: id, validated: true, score: result.overallScore, databaseWrites: 0 }));
    expect(result.criteria.map((c) => c.criterionId)).toEqual(task.rubric.map((c) => c.criterion_id));
    expect(result.overallScore).toBeLessThanOrEqual(50);
    expect(result.criteria.reduce((sum, c) => sum + c.maxScore, 0)).toBe(100);
    expect(result.privateDetails).toBeDefined();

  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error ? error.status : "validation_or_network";
    const message = error instanceof Error ? error.message : "";
    const known = ["Kết quả AI chưa bao phủ đúng từng mục trong tiêu chí nguồn.", "AI chấm vượt điểm tối đa của mục nguồn.", "AI chấm điểm khi chưa có trích dẫn nguyên văn trong bài làm."];
    console.info(JSON.stringify({ check: "refreshed-source-failure", positionId: id, status, kind: error instanceof Error ? error.name : "Unknown", validation: known.indexOf(message) }));
    throw new Error(`Refreshed source check stopped (${status}); synthetic answer only, no account data saved.`);
  }
}, 110_000);

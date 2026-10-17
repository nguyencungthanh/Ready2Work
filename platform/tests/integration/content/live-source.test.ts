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
}, 60_000);

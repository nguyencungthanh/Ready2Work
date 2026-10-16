import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/ai/gemini", () => ({ generateStructured: vi.fn() }));
import source from "@/data/task-rubrics.json";
import financial from "@/data/task-artifacts/TCNH-01-DATA-01.json";
import credit from "@/data/task-artifacts/TCNH-02-DATA-01.json";
import dataAnalyst from "@/data/task-artifacts/IT-03-DATA-01.json";
import supplyChain from "@/data/task-artifacts/LOG-02-DATA-01.json";
import { scoreSourceEvaluation, validateSourceTask } from "@/lib/simulation/checklist-evaluator";
interface Task {
  position_id: string; time_limit_minutes: number;
  rubric: { criterion_id: string; checklist: { checklist_id: string; scoring_source: string }[] }[];
  hard_constraints?: { constraint_id: string }[];
}
const tasks = source.industries.flatMap((industry) => industry.tasks) as unknown as Task[];
const artifacts = { "TCNH-01-DATA-01": financial, "TCNH-02-DATA-01": credit, "IT-03-DATA-01": dataAnalyst, "LOG-02-DATA-01": supplyChain };
function task(id: string) { return { ...tasks.find((row) => row.position_id === id)!, artifacts }; }
function fullOutput(input: Task) {
  return { summary: "Nhận xét dựa trên bài làm.",
    checklists: input.rubric.flatMap((criterion) => criterion.checklist).filter((item) => item.scoring_source !== "system").map((item) => ({ checklistId: item.checklist_id, status: "full", evidence: "Bằng chứng trong nội dung bài làm." })),
    constraints: (input.hard_constraints ?? []).map((constraint) => ({ constraintId: constraint.constraint_id, triggered: false, missingCount: 0, evidence: "Không vi phạm." })),
    criterionFeedback: input.rubric.map((criterion) => ({ criterionId: criterion.criterion_id, feedback: "Đáp ứng yêu cầu của tiêu chí." })),
  };
}
describe("source checklist grading", () => {
  it("validates all fifteen supplied task rubrics and required datasets", () => {
    expect(tasks).toHaveLength(15);
    for (const input of tasks) expect(validateSourceTask({ ...input, artifacts }).position_id).toBe(input.position_id);
  });
  it("derives time points from the server-recorded duration even if AI returns perfect content", () => {
    const input = task("TCNH-01");
    const raw = fullOutput(input);
    expect(scoreSourceEvaluation(raw, input, 60 * 60, 500).overallScore).toBe(100);
    expect(scoreSourceEvaluation(raw, input, 60 * 60 + 1, 500).overallScore).toBe(98);
  });
  it("applies the existing late hybrid cap to content/time combined items", () => {
    const input = task("MKT-02");
    expect(scoreSourceEvaluation(fullOutput(input), input, 45 * 60 + 1, 500).overallScore).toBe(98);
  });
  it("applies an explicit task-level zero rule after summing criteria", () => {
    const input = task("LOG-03"); const raw = fullOutput(input);
    raw.constraints[0] = { constraintId: "LOG-03-HC1", triggered: true, missingCount: 0, evidence: "Bài làm lựa chọn phương án bị cấm." };
    const result = scoreSourceEvaluation(raw, input, 300, 500);
    expect(result.overallScore).toBe(0);
    expect(result.criteria.every((criterion) => criterion.score === 0)).toBe(true);
  });
  it("applies the source criterion-level zero rule without zeroing unrelated criteria", () => {
    const input = task("LOG-02"); const raw = fullOutput(input);
    raw.constraints[0] = { constraintId: "LOG-02-HC1", triggered: true, missingCount: 0, evidence: "Phép tính bao gồm dữ liệu ngoại lai." };
    const result = scoreSourceEvaluation(raw, input, 300, 500);
    expect(result.criteria.find((criterion) => criterion.criterionId === "C1")?.score).toBe(0);
    expect(result.overallScore).toBe(60);
  });
  it("rejects invented checklist and constraint IDs or missing datasets", () => {
    const input = task("TCNH-01"); const raw = fullOutput(input);
    raw.checklists[0]!.checklistId = "not-in-source";
    expect(() => scoreSourceEvaluation(raw, input, 300, 500)).toThrow("exactly once");
    expect(() => validateSourceTask({ ...input, artifacts: {} })).toThrow("dataset");
    expect(() => scoreSourceEvaluation(fullOutput(input), input, -1, 500)).toThrow("timing");
  });
});

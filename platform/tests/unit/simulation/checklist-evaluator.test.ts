import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/ai/gemini", () => ({ generateStructured: vi.fn() }));
import legacy from "../../fixtures/legacy-simulation-source.json";
import { scoreSourceEvaluation, validateSourceTask } from "@/lib/simulation/checklist-evaluator";
interface Task {
  position_id: string; time_limit_minutes: number;
  rubric: { criterion_id: string; checklist: { checklist_id: string; scoring_source: string }[] }[];
  hard_constraints?: { constraint_id: string }[];
}
const tasks = legacy.tasks.industries.flatMap((industry) => industry.tasks) as unknown as Task[];
const artifacts = legacy.artifacts;
function task(id: string) { return { ...tasks.find((row) => row.position_id === id)!, artifacts }; }
function fullOutput(input: Task) {
  return { summary: "Nhận xét dựa trên bài làm.",
    checklists: input.rubric.flatMap((criterion) => criterion.checklist).filter((item) => item.scoring_source !== "system").map((item) => ({ checklistId: item.checklist_id, status: "full", evidence: "Bằng chứng trong nội dung bài làm.", reason: "Đối chiếu đạt với yêu cầu của mục." })),
    constraints: (input.hard_constraints ?? []).map((constraint) => ({ constraintId: constraint.constraint_id, triggered: false, missingCount: 0, evidence: "Không vi phạm." })),
    criterionFeedback: input.rubric.map((criterion) => ({ criterionId: criterion.criterion_id, feedback: "Đáp ứng yêu cầu của tiêu chí." })),
  };
}
describe("historical checklist scoring compatibility", () => {
  it("validates the fifteen historical task snapshots and datasets", () => {
    expect(tasks).toHaveLength(15);
    for (const input of tasks) expect(validateSourceTask({ ...input, artifacts }).position_id).toBe(input.position_id);
  });
  it("derives time points from the server-recorded duration even if AI returns perfect content", () => {
    const input = task("TCNH-01");
    const raw = fullOutput(input);
    expect(scoreSourceEvaluation(raw, input, 60 * 60, 500, "Bằng chứng trong nội dung bài làm.").overallScore).toBe(100);
    expect(scoreSourceEvaluation(raw, input, 60 * 60 + 1, 500, "Bằng chứng trong nội dung bài làm.").overallScore).toBe(98);
  });
  it("applies the existing late hybrid cap to content/time combined items", () => {
    const input = task("MKT-02");
    expect(scoreSourceEvaluation(fullOutput(input), input, 45 * 60 + 1, 500, "Bằng chứng trong nội dung bài làm.").overallScore).toBe(98);
  });
  it("applies an explicit task-level zero rule after summing criteria", () => {
    const input = task("LOG-03"); const raw = fullOutput(input);
    raw.constraints[0] = { constraintId: "LOG-03-HC1", triggered: true, missingCount: 0, evidence: "Bài làm lựa chọn phương án bị cấm." };
    const result = scoreSourceEvaluation(raw, input, 300, 500, "Bằng chứng trong nội dung bài làm.");
    expect(result.overallScore).toBe(0);
    expect(result.criteria.every((criterion) => criterion.score === 0)).toBe(true);
  });
  it("applies the source criterion-level zero rule without zeroing unrelated criteria", () => {
    const input = task("LOG-02"); const raw = fullOutput(input);
    raw.constraints[0] = { constraintId: "LOG-02-HC1", triggered: true, missingCount: 0, evidence: "Phép tính bao gồm dữ liệu ngoại lai." };
    const result = scoreSourceEvaluation(raw, input, 300, 500, "Bằng chứng trong nội dung bài làm.");
    expect(result.criteria.find((criterion) => criterion.criterionId === "C1")?.score).toBe(0);
    expect(result.overallScore).toBe(60);
  });
  it("rejects invented checklist and constraint IDs or missing datasets", () => {
    const input = task("TCNH-01"); const raw = fullOutput(input);
    raw.checklists[0]!.checklistId = "not-in-source";
    expect(() => scoreSourceEvaluation(raw, input, 300, 500, "Bằng chứng trong nội dung bài làm.")).toThrow("exactly once");
    expect(() => validateSourceTask({ ...input, artifacts: {} })).toThrow("dataset");
    expect(() => scoreSourceEvaluation(fullOutput(input), input, -1, 500, "Bằng chứng trong nội dung bài làm.")).toThrow("timing");
  });
  it("rejects awarded points backed by invented quotes and permits an explicit missing-evidence zero", () => {
    const input = task("MKT-01"); const raw = fullOutput(input);
    expect(() => scoreSourceEvaluation(raw, input, 300, 8, "Bài làm chưa phân tích nội dung yêu cầu.")).toThrow("evidence present");
    for (const item of raw.checklists) { item.status = "zero"; item.evidence = ""; item.reason = "Bài làm chưa có bằng chứng cho yêu cầu này."; }
    const result = scoreSourceEvaluation(raw, input, 300, 8, "Bài làm chưa phân tích nội dung yêu cầu.");
    expect(result.criteria.filter((criterion) => criterion.criterionId !== "C4").every((criterion) => criterion.score === 0)).toBe(true);
  });
});

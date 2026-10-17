import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/ai/gemini", () => ({ generateStructured: vi.fn() }));
import { generateStructured } from "@/lib/ai/gemini";
import { evaluateCurrentSource, scoreCurrentSourceEvaluation, validateCurrentSourceTask } from "@/lib/simulation/source-evaluator";

const task = { source_version: "20261017", source_policy: "document_only", content_revision: "20261017-doc-only", grading_ready: true, time_limit_minutes: 60, rubric: [
  { criterion_id: "C1", criterion_name: "Độ chính xác", max_points: 4, checklist: [{ checklist_id: "C1-1", text: "Hướng dẫn điểm thành phần nguyên bản.", points: 4 }] },
  { criterion_id: "C2", criterion_name: "Lập luận", max_points: 96, checklist: [{ checklist_id: "C2-1", text: "Hướng dẫn chấm nguyên bản.", points: 96 }] },
] };
function output(points = 2.5) { return { summary: "Cần bổ sung bằng chứng.", checklists: [
  { checklistId: "C1-1", awardedPoints: points, evidence: "Có dữ kiện hai năm", reason: "Đạt mức điểm thành phần theo nguồn, chưa đủ năm thứ ba." },
  { checklistId: "C2-1", awardedPoints: 0, evidence: "", reason: "Chưa nêu lập luận." },
], criterionFeedback: [{ criterionId: "C1", feedback: "Cần bổ sung năm còn thiếu." }, { criterionId: "C2", feedback: "Chưa nêu lập luận." }] }; }
beforeEach(() => vi.clearAllMocks());
describe("current source rubric grading", () => {
  it("preserves fractional source awards rather than quarter-point status bands", () => {
    const result = scoreCurrentSourceEvaluation(output(), task, "Có dữ kiện hai năm", 30);
    expect(result.criteria[0]?.score).toBe(2.5);
    expect(result.criteria[0]?.maxScore).toBe(4);
    expect(result.tooShort).toBe(false);
  });
  it("requires every source ID, respects its maximum and verifies awarded evidence", () => {
    expect(() => scoreCurrentSourceEvaluation(output(4.1), task, "Có dữ kiện hai năm", 30)).toThrow("vượt điểm");
    expect(() => scoreCurrentSourceEvaluation(output(), task, "Nội dung khác", 30)).toThrow("trích dẫn nguyên văn");
    const missing = output(); missing.checklists.pop();
    expect(() => scoreCurrentSourceEvaluation(missing, task, "Có dữ kiện hai năm", 30)).toThrow("từng mục");
    const duplicate = output(); duplicate.checklists[1]!.checklistId = "C1-1";
    expect(() => scoreCurrentSourceEvaluation(duplicate, task, "Có dữ kiện hai năm", 30)).toThrow("từng mục");
  });
  it("does not call AI for an unresolved rubric", async () => {
    await expect(evaluateCurrentSource("Nội dung", "Bối cảnh", "Đề bài", { ...task, grading_ready: false }, 30)).rejects.toThrow("chờ xác nhận");
    expect(generateStructured).not.toHaveBeenCalled();
  });
  it("blocks older material policies and revisions before calling AI", async () => {
    for (const changed of [{ source_policy: "supplementary" }, { content_revision: "20261017-old" }, { source_policy: undefined }, { content_revision: undefined }]) {
      await expect(evaluateCurrentSource("Nội dung", "Bối cảnh", "Đề bài", { ...task, ...changed }, 30)).rejects.toThrow();
    }
    expect(generateStructured).not.toHaveBeenCalled();
  });
  it("rejects a mismatched source total without an explicit normalization rule", () => {
    const mismatch = { ...task, rubric: [...task.rubric, { criterion_id: "C3", criterion_name: "Bổ sung", max_points: 5, checklist: [{ checklist_id: "C3-1", text: "Tiêu chí nguồn", points: 5 }] }] };
    expect(() => validateCurrentSourceTask(mismatch)).toThrow("quy tắc quy đổi");
  });
});

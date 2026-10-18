import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/ai/gemini", () => ({ generateStructured: vi.fn() }));
import { generateStructured } from "@/lib/ai/gemini";
import { evaluateInterviewWithAI, validateInterviewEvaluation } from "@/lib/interview/ai-evaluator";
const rubric = [{ id: "a", label: "Knowledge", description: "source guidance", weight: 10, maxScore: 10 }, { id: "b", label: "Reasoning", description: "source guidance", weight: 30, maxScore: 30 }];
describe("interview AI output validation", () => {
  it("preserves source criterion points and normalizes the question to 100", () => {
    const result = validateInterviewEvaluation({ criteria: [{ id: "a", score: 10, note: "clear" }, { id: "b", score: 10, note: "missing evidence" }] }, rubric);
    expect(result.score).toBe(50);
    expect(result.criteria.map((row) => row.maxScore)).toEqual([10, 30]);
  });
  it("rejects omitted, duplicate, foreign and over-limit criterion results", () => {
    for (const criteria of [
      [{ id: "a", score: 10, note: "clear" }],
      [{ id: "a", score: 10, note: "clear" }, { id: "a", score: 10, note: "duplicate" }],
      [{ id: "a", score: 10, note: "clear" }, { id: "foreign", score: 10, note: "wrong" }],
      [{ id: "a", score: 11, note: "too many" }, { id: "b", score: 10, note: "clear" }],
    ]) expect(() => validateInterviewEvaluation({ criteria }, rubric)).toThrow();
  });
  it("accepts zero marks and decimal source points without turning a weak answer into a submission error", () => {
    const result = validateInterviewEvaluation({ criteria: [{ id: "a", score: 0, note: "Chưa nêu bằng chứng." }, { id: "b", score: 7.5, note: "Mới đáp ứng một phần." }] }, rubric);
    expect(result.score).toBe(19);
    expect(result.criteria.map((row) => row.score)).toEqual([0, 7.5]);
  });
  it("sends the short QA response for evaluation and returns a valid low score", async () => {
    const answer = "Reactive/Proactive, Quality Assurance/Quality Control.";
    vi.mocked(generateStructured).mockResolvedValueOnce({ criteria: [{ id: "a", score: 0, note: "Chưa giải thích định nghĩa." }, { id: "b", score: 5, note: "Có thuật ngữ nhưng thiếu lập luận." }] });
    const result = await evaluateInterviewWithAI(answer, "Bạn hãy phân biệt Testing và Quality Assurance", "Hướng dẫn đối chiếu riêng.", rubric);
    expect(result.score).toBe(13);
    expect(vi.mocked(generateStructured).mock.calls.at(-1)?.[0]).toContain(answer);
  });
  it("corrects an over-limit reply once while retaining strict maxima and not echoing the invalid output", async () => {
    const provider = vi.mocked(generateStructured).mockReset();
    provider.mockResolvedValueOnce({ criteria: [{ id: "a", score: 100, note: "PRIVATE_INVALID_OUTPUT" }, { id: "b", score: 100, note: "bad" }] })
      .mockResolvedValueOnce({ criteria: [{ id: "a", score: 5, note: "Đạt một phần." }, { id: "b", score: 15, note: "Đạt một phần." }] });
    expect((await evaluateInterviewWithAI("Câu trả lời giả", "Câu hỏi", "Tham chiếu", rubric)).score).toBe(50);
    expect(provider).toHaveBeenCalledTimes(2);
    expect(provider.mock.calls[1]![0]).toContain("EXCESS_POINTS");
    expect(provider.mock.calls[1]![0]).not.toContain("PRIVATE_INVALID_OUTPUT");
    provider.mockReset().mockResolvedValue({ criteria: [] });
    await expect(evaluateInterviewWithAI("Giả", "Câu hỏi", "Tham chiếu", rubric)).rejects.toThrow("exact interview rubric");
    expect(provider).toHaveBeenCalledTimes(2);
  });
  it.each([401, 429])("does not retry HTTP %s or invent a grade", async (status) => {
    const provider = vi.mocked(generateStructured).mockReset().mockRejectedValue({ status });
    await expect(evaluateInterviewWithAI("Giả", "Câu hỏi", "Tham chiếu", rubric)).rejects.toMatchObject({ status });
    expect(provider).toHaveBeenCalledOnce();
  });
});

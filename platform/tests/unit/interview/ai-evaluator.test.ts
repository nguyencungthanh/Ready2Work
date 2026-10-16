import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/ai/gemini", () => ({ generateStructured: vi.fn() }));
import { validateInterviewEvaluation } from "@/lib/interview/ai-evaluator";
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
});

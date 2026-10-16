import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/ai/gemini", () => ({ generateStructured: vi.fn() }));
import { generateStructured } from "@/lib/ai/gemini";
import { evaluateSubmissionWithAI } from "@/lib/simulation/ai-evaluator";
const generate = vi.mocked(generateStructured);
const rubric = [{ id: "a", label: "Analysis", description: "private answer key", keywords: [], weight: 40, maxScore: 40 }, { id: "b", label: "Plan", description: "private checklist", keywords: [], weight: 60, maxScore: 60 }];
function response(criteria: { criterionId: string; score: number; band: string; feedback: string }[]) { return { overallBand: "Strong", summary: "Measured feedback", criteria }; }
const row = (criterionId: string, score: number) => ({ criterionId, score, band: "Strong", feedback: "Grounded feedback" });
beforeEach(() => generate.mockReset());
describe("simulation rubric integrity", () => {
  it("rejects duplicated or omitted criteria rather than counting an incomplete grade", async () => {
    generate.mockResolvedValue(response([row("a", 40), row("a", 40)]));
    await expect(evaluateSubmissionWithAI("answer", "brief", "task", rubric, 0)).rejects.toThrow("exactly once");
  });
  it("uses actual criterion maxima, recomputes the band and withholds private answer guidance", async () => {
    generate.mockResolvedValue(response([row("a", 20), row("b", 30)]));
    const result = await evaluateSubmissionWithAI("answer", "brief", "task", rubric, 0);
    expect(result.overallScore).toBe(50);
    expect(result.overallBand).toBe("Proficient");
    expect(result.criteria.map((criterion) => criterion.description)).toEqual(["", ""]);
    expect(result.criteria.map((criterion) => criterion.maxScore)).toEqual([40, 60]);
  });
  it("rejects criterion points above the supplied maximum", async () => {
    generate.mockResolvedValue(response([row("a", 41), row("b", 30)]));
    await expect(evaluateSubmissionWithAI("answer", "brief", "task", rubric, 0)).rejects.toThrow("maximum");
  });
});

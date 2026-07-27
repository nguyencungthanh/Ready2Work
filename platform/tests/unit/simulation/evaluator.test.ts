import { describe, expect, it } from "vitest";
import {
  bandForRatio,
  evaluateSubmission,
  improvementSuggestions,
  type RubricCriterion,
} from "@/lib/simulation/evaluator";

const rubric: RubricCriterion[] = [
  {
    id: "risk",
    label: "Risk identification",
    description: "Names the risk.",
    keywords: ["risk", "overstat", "cut-off", "collectab"],
    weight: 50,
  },
  {
    id: "procedures",
    label: "Procedures",
    description: "Proposes procedures.",
    keywords: ["confirmation", "ageing", "sample", "reconcil"],
    weight: 50,
  },
];

const longFiller = "word ".repeat(200);

describe("bandForRatio", () => {
  it("maps ratios to the four bands", () => {
    expect(bandForRatio(1)).toBe("Strong");
    expect(bandForRatio(0.6)).toBe("Proficient");
    expect(bandForRatio(0.3)).toBe("Developing");
    expect(bandForRatio(0)).toBe("Emerging");
  });
});

describe("evaluateSubmission", () => {
  it("is deterministic for identical input", () => {
    const text = `${longFiller} risk overstat confirmation ageing`;
    expect(evaluateSubmission(text, rubric, 10)).toEqual(
      evaluateSubmission(text, rubric, 10),
    );
  });

  it("scores a submission covering both criteria highly", () => {
    const text = `${longFiller} There is a risk revenue is overstat and receivables not collectab.
      I would send a confirmation, review the ageing, and reconcil the ledger.`;
    const result = evaluateSubmission(text, rubric, 10);

    expect(result.overallScore).toBeGreaterThanOrEqual(75);
    expect(result.overallBand).toBe("Strong");
  });

  it("scores an off-topic submission at the bottom", () => {
    const result = evaluateSubmission(`${longFiller} I like football and pizza.`, rubric, 10);

    expect(result.overallScore).toBe(0);
    expect(result.overallBand).toBe("Emerging");
  });

  it("reports which concepts were found and which were missing", () => {
    const result = evaluateSubmission(`${longFiller} risk overstat`, rubric, 10);
    const riskCriterion = result.criteria.find((c) => c.criterionId === "risk");

    expect(riskCriterion?.matched).toContain("risk");
    expect(riskCriterion?.missing).toContain("cut-off");
  });

  it("caps the score when the response is below the minimum length", () => {
    // Hits every keyword but far too short to have demonstrated reasoning.
    const text = "risk overstat cut-off collectab confirmation ageing sample reconcil";
    const result = evaluateSubmission(text, rubric, 150);

    expect(result.tooShort).toBe(true);
    expect(result.overallScore).toBeLessThanOrEqual(40);
  });

  it("counts words rather than characters", () => {
    const result = evaluateSubmission("one two three", rubric, 1);
    expect(result.wordCount).toBe(3);
  });

  it("is case-insensitive when matching evidence", () => {
    const lower = evaluateSubmission(`${longFiller} risk confirmation`, rubric, 10);
    const upper = evaluateSubmission(`${longFiller} RISK CONFIRMATION`, rubric, 10);
    expect(upper.overallScore).toBe(lower.overallScore);
  });

  it("does not divide by zero on an empty rubric", () => {
    const result = evaluateSubmission(longFiller, [], 10);
    expect(result.overallScore).toBe(0);
    expect(Number.isNaN(result.overallScore)).toBe(false);
  });
});

describe("improvementSuggestions", () => {
  it("leads with the length problem when the answer is too short", () => {
    const result = evaluateSubmission("risk", rubric, 150);
    expect(improvementSuggestions(result)[0]).toMatch(/below the expected length/);
  });

  it("suggests the weakest criteria first", () => {
    const text = `${longFiller} risk overstat cut-off collectab`;
    const result = evaluateSubmission(text, rubric, 10);
    // Procedures scored nothing, so it should be raised first.
    expect(improvementSuggestions(result)[0]).toMatch(/Procedures/);
  });
});

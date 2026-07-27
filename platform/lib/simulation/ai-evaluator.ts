import "server-only";
import { z } from "zod";
import { generateStructured } from "@/lib/ai/gemini";

export interface RubricCriterion {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  weight: number;
}

export type Band = "Emerging" | "Developing" | "Proficient" | "Strong";

export interface CriterionResult {
  criterionId: string;
  label: string;
  description: string;
  band: Band;
  score: number;
  maxScore: number;
  feedback: string;
}

export interface EvaluationResult {
  overallScore: number;
  overallBand: Band;
  summary: string;
  criteria: CriterionResult[];
  wordCount: number;
  tooShort: boolean;
}

const BANDS = ["Emerging", "Developing", "Proficient", "Strong"] as const;
const MAX_CRITERION_SCORE = 4;

const criterionResultSchema = z.object({
  criterionId: z.string(),
  band: z.enum(BANDS),
  score: z.number().int().min(0).max(MAX_CRITERION_SCORE),
  feedback: z.string().min(1).max(500),
});

const aiResponseSchema = z.object({
  overallBand: z.enum(BANDS),
  summary: z.string().min(1).max(800),
  criteria: z.array(criterionResultSchema),
});

const GEMINI_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    overallBand: { type: "string", enum: BANDS },
    summary: { type: "string" },
    criteria: {
      type: "array",
      items: {
        type: "object",
        properties: {
          criterionId: { type: "string" },
          band: { type: "string", enum: BANDS },
          score: { type: "integer" },
          feedback: { type: "string" },
        },
        required: ["criterionId", "band", "score", "feedback"],
      },
    },
  },
  required: ["overallBand", "summary", "criteria"],
};

function buildPrompt(
  brief: string,
  taskInstructions: string,
  rubric: RubricCriterion[],
  content: string,
  wordCount: number,
  minWords: number,
): string {
  const rubricText = rubric
    .map((c) => `- id: ${c.id}\n  label: ${c.label}\n  description: ${c.description}\n  weight: ${c.weight}%`)
    .join("\n");

  return `You are grading a candidate's response to a job simulation exercise. Score it against the rubric using only the content of the submission. Do not infer or comment on identity, accent, background, or writing style unrelated to the rubric.

Simulation brief:
${brief}

Task instructions:
${taskInstructions}

Rubric (score each criterion 0-${MAX_CRITERION_SCORE}, band must reflect the score):
${rubricText}

The submission is ${wordCount} words (minimum expected: ${minWords} words). A response substantially under the minimum cannot demonstrate full depth and should be scored accordingly.

Candidate submission:
"""
${content}
"""

For each rubric criterion, give a band (Emerging/Developing/Proficient/Strong), a score 0-${MAX_CRITERION_SCORE}, and a short (1-3 sentence) feedback note grounded in the submission text. Also give an overall band and a short summary (2-4 sentences) of strengths and what to improve. Return every criterion id listed above exactly once.`;
}

function bandForRatio(ratio: number): Band {
  if (ratio >= 0.75) return "Strong";
  if (ratio >= 0.5) return "Proficient";
  if (ratio >= 0.25) return "Developing";
  return "Emerging";
}

/**
 * Scores a submission with Gemini instead of deterministic keyword matching.
 * The AI decides score/band/feedback per criterion; this function only
 * validates the shape, computes the weighted overall score, and applies the
 * length cap so a short response cannot be rewarded for hitting rubric
 * language without depth (plan section 14.9 confidence rules still apply via
 * schema validation - malformed output throws rather than showing partial
 * results).
 */
export async function evaluateSubmissionWithAI(
  content: string,
  brief: string,
  taskInstructions: string,
  rubric: RubricCriterion[],
  minWords: number,
): Promise<EvaluationResult> {
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const tooShort = wordCount < minWords;
  const prompt = buildPrompt(brief, taskInstructions, rubric, content, wordCount, minWords);

  let parsed: z.infer<typeof aiResponseSchema>;
  try {
    const raw = await generateStructured(prompt, GEMINI_RESPONSE_SCHEMA);
    parsed = aiResponseSchema.parse(raw);
  } catch {
    // Retry once with the same prompt before giving up.
    const raw = await generateStructured(prompt, GEMINI_RESPONSE_SCHEMA);
    parsed = aiResponseSchema.parse(raw);
  }

  const rubricById = new Map(rubric.map((c) => [c.id, c]));
  const criteria: CriterionResult[] = parsed.criteria
    .filter((c) => rubricById.has(c.criterionId))
    .map((c) => {
      const rubricCriterion = rubricById.get(c.criterionId)!;
      return {
        criterionId: c.criterionId,
        label: rubricCriterion.label,
        description: rubricCriterion.description,
        band: c.band,
        score: c.score,
        maxScore: MAX_CRITERION_SCORE,
        feedback: c.feedback,
      };
    });

  const totalWeight = rubric.reduce((sum, c) => sum + c.weight, 0);
  const weighted = rubric.reduce((sum, criterion) => {
    const result = criteria.find((c) => c.criterionId === criterion.id);
    if (!result) return sum;
    return sum + (result.score / MAX_CRITERION_SCORE) * criterion.weight;
  }, 0);

  let overallScore = totalWeight === 0 ? 0 : Math.round((weighted / totalWeight) * 100);
  if (tooShort) {
    overallScore = Math.min(overallScore, 40);
  }

  return {
    overallScore,
    overallBand: tooShort ? bandForRatio(overallScore / 100) : parsed.overallBand,
    summary: parsed.summary,
    criteria,
    wordCount,
    tooShort,
  };
}

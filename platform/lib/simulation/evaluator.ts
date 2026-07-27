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
  matched: string[];
  missing: string[];
}

export interface EvaluationResult {
  overallScore: number;
  overallBand: Band;
  criteria: CriterionResult[];
  wordCount: number;
  tooShort: boolean;
}

const MAX_CRITERION_SCORE = 4;

export function bandForRatio(ratio: number): Band {
  if (ratio >= 0.75) return "Strong";
  if (ratio >= 0.5) return "Proficient";
  if (ratio >= 0.25) return "Developing";
  return "Emerging";
}

/**
 * Scores a submission against its rubric by checking for evidence of each
 * criterion in the text.
 *
 * Deliberately deterministic and transparent: the user is shown exactly which
 * concepts were found and which were missing, and identical text always scores
 * identically (plan sections 2.2 and 14.5). This is a coverage check, not a
 * judgement of writing quality - a real deployment would add human review,
 * which the plan requires before any high-stakes use.
 */
export function evaluateSubmission(
  content: string,
  rubric: RubricCriterion[],
  minWords: number,
): EvaluationResult {
  const normalised = content.toLowerCase();
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const tooShort = wordCount < minWords;

  const criteria: CriterionResult[] = rubric.map((criterion) => {
    const matched = criterion.keywords.filter((keyword) =>
      normalised.includes(keyword.toLowerCase()),
    );
    const missing = criterion.keywords.filter(
      (keyword) => !normalised.includes(keyword.toLowerCase()),
    );

    // Coverage saturates: hitting half the keywords already demonstrates the
    // concept, so we do not require every synonym.
    const coverage =
      criterion.keywords.length === 0
        ? 0
        : Math.min(1, matched.length / Math.max(1, Math.ceil(criterion.keywords.length / 2)));

    const score = Math.round(coverage * MAX_CRITERION_SCORE);

    return {
      criterionId: criterion.id,
      label: criterion.label,
      description: criterion.description,
      band: bandForRatio(score / MAX_CRITERION_SCORE),
      score,
      maxScore: MAX_CRITERION_SCORE,
      matched,
      missing,
    };
  });

  const totalWeight = rubric.reduce((sum, c) => sum + c.weight, 0);
  const weighted = rubric.reduce((sum, criterion, index) => {
    const result = criteria[index];
    if (!result) return sum;
    return sum + (result.score / MAX_CRITERION_SCORE) * criterion.weight;
  }, 0);

  let overallScore = totalWeight === 0 ? 0 : Math.round((weighted / totalWeight) * 100);

  // A submission below the required length cannot demonstrate depth, so it is
  // capped rather than rewarded for keyword stuffing.
  if (tooShort) {
    overallScore = Math.min(overallScore, 40);
  }

  return {
    overallScore,
    overallBand: bandForRatio(overallScore / 100),
    criteria,
    wordCount,
    tooShort,
  };
}

/** Improvement suggestions derived from the weakest criteria. */
export function improvementSuggestions(result: EvaluationResult): string[] {
  const suggestions = result.criteria
    .filter((criterion) => criterion.score < MAX_CRITERION_SCORE)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(
      (criterion) =>
        `${criterion.label}: ${criterion.description} Consider addressing ${criterion.missing
          .slice(0, 4)
          .join(", ")}.`,
    );

  if (result.tooShort) {
    suggestions.unshift(
      `Your response is ${result.wordCount} words, which is below the expected length. Develop your reasoning further.`,
    );
  }

  return suggestions;
}

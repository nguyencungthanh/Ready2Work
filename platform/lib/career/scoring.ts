export const RIASEC_DIMENSIONS = [
  "realistic",
  "investigative",
  "artistic",
  "social",
  "enterprising",
  "conventional",
] as const;

export type RiasecDimension = (typeof RIASEC_DIMENSIONS)[number];

export type RiasecScores = Record<RiasecDimension, number>;

export interface ScoredQuestion {
  id: string;
  dimension: RiasecDimension;
}

/** Answers are 1-5 Likert values keyed by question id. */
export type AnswerMap = Record<string, number>;

export const MIN_ANSWER = 1;
export const MAX_ANSWER = 5;

/**
 * Deterministic RIASEC scoring: the same answers always produce the same
 * scores. Each dimension is the mean of its answers rescaled from the 1-5
 * Likert range onto 0-100, so dimensions with different question counts stay
 * comparable. No AI is involved - the plan requires scores be reproducible
 * and explainable (section 11.3).
 */
export function scoreAssessment(
  questions: ScoredQuestion[],
  answers: AnswerMap,
): RiasecScores {
  const totals: Record<string, { sum: number; count: number }> = {};
  for (const dimension of RIASEC_DIMENSIONS) {
    totals[dimension] = { sum: 0, count: 0 };
  }

  for (const question of questions) {
    const raw = answers[question.id];
    if (typeof raw !== "number") continue;

    const clamped = Math.min(MAX_ANSWER, Math.max(MIN_ANSWER, raw));
    const bucket = totals[question.dimension];
    if (bucket) {
      bucket.sum += clamped;
      bucket.count += 1;
    }
  }

  const scores = {} as RiasecScores;
  for (const dimension of RIASEC_DIMENSIONS) {
    const { sum, count } = totals[dimension]!;
    // No answers for a dimension scores 0 rather than dividing by zero.
    scores[dimension] =
      count === 0
        ? 0
        : Math.round(((sum / count - MIN_ANSWER) / (MAX_ANSWER - MIN_ANSWER)) * 100);
  }

  return scores;
}

export interface CareerProfile {
  id: string;
  realistic: number;
  investigative: number;
  artistic: number;
  social: number;
  enterprising: number;
  conventional: number;
}

/**
 * Similarity between a user's profile and a career's ideal profile, 0-100.
 *
 * Uses mean absolute difference across the six dimensions rather than
 * Euclidean distance: it degrades more gently and is far easier to explain
 * to a user, which the plan requires (section 2.2, evidence over opaque
 * scores).
 */
export function matchScore(user: RiasecScores, career: CareerProfile): number {
  let totalDifference = 0;
  for (const dimension of RIASEC_DIMENSIONS) {
    totalDifference += Math.abs(user[dimension] - career[dimension]);
  }
  const meanDifference = totalDifference / RIASEC_DIMENSIONS.length;
  return Math.round(100 - meanDifference);
}

export interface RankedCareer<T extends CareerProfile> {
  career: T;
  score: number;
}

/**
 * Ranks careers by match score. Ties break on career id so repeated runs
 * return an identical order (section 11.6: same answers, same ranking).
 */
export function rankCareers<T extends CareerProfile>(
  user: RiasecScores,
  careers: T[],
): RankedCareer<T>[] {
  return careers
    .map((career) => ({ career, score: matchScore(user, career) }))
    .sort((a, b) =>
      b.score !== a.score ? b.score - a.score : a.career.id.localeCompare(b.career.id),
    );
}

/** The dimensions a user scored highest on, strongest first. */
export function topDimensions(scores: RiasecScores, count = 3): RiasecDimension[] {
  return [...RIASEC_DIMENSIONS]
    .sort((a, b) => (scores[b] !== scores[a] ? scores[b] - scores[a] : a.localeCompare(b)))
    .slice(0, count);
}

export const DIMENSION_LABELS: Record<RiasecDimension, string> = {
  realistic: "Realistic (hands-on, practical)",
  investigative: "Investigative (analytical, research-minded)",
  artistic: "Artistic (creative, expressive)",
  social: "Social (helping, teaching)",
  enterprising: "Enterprising (persuading, leading)",
  conventional: "Conventional (organising, detail-oriented)",
};

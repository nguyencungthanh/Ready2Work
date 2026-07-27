export interface InterviewCriterionResult {
  label: string;
  score: number;
  maxScore: number;
  note: string;
}

export interface InterviewAnswerEvaluation {
  score: number;
  criteria: InterviewCriterionResult[];
}

const MAX_SCORE = 4;

/**
 * Deterministic, content-only answer scoring (feature.md section 4: "AI
 * evaluates response content only... Voice, accent, regional background,
 * and gender are not used as scoring criteria"). Only answer_text and the
 * question's keywords/guidance are read - never audio, voice, or identity
 * signals.
 */
export function evaluateInterviewAnswer(
  answerText: string,
  keywords: string[],
): InterviewAnswerEvaluation {
  const normalized = answerText.toLowerCase();
  const wordCount = answerText.trim().split(/\s+/).filter(Boolean).length;

  const relevance = scoreRelevance(normalized, keywords);
  const structure = scoreStructure(answerText, wordCount);
  const evidence = scoreEvidence(normalized);

  const criteria: InterviewCriterionResult[] = [
    {
      label: "Relevance to the question",
      score: relevance.score,
      maxScore: MAX_SCORE,
      note: relevance.note,
    },
    {
      label: "Structure and clarity",
      score: structure.score,
      maxScore: MAX_SCORE,
      note: structure.note,
    },
    {
      label: "Evidence and examples",
      score: evidence.score,
      maxScore: MAX_SCORE,
      note: evidence.note,
    },
  ];

  const totalMax = criteria.length * MAX_SCORE;
  const totalScore = criteria.reduce((sum, c) => sum + c.score, 0);
  const score = Math.round((totalScore / totalMax) * 100);

  return { score, criteria };
}

function scoreRelevance(
  normalized: string,
  keywords: string[],
): { score: number; note: string } {
  if (keywords.length === 0) {
    return { score: 2, note: "No keyword guidance available for this question." };
  }
  const matched = keywords.filter((k) => normalized.includes(k.toLowerCase()));
  const ratio = matched.length / keywords.length;

  if (ratio >= 0.6) {
    return { score: 4, note: `Directly addresses the question (covers ${matched.length}/${keywords.length} expected topics).` };
  }
  if (ratio >= 0.3) {
    return { score: 3, note: `Partially addresses the question (covers ${matched.length}/${keywords.length} expected topics).` };
  }
  if (ratio > 0) {
    return { score: 2, note: `Touches on the topic but misses most expected points (${matched.length}/${keywords.length}).` };
  }
  return { score: 1, note: "Does not clearly address what the question is asking." };
}

function scoreStructure(answerText: string, wordCount: number): { score: number; note: string } {
  const sentenceCount = answerText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean).length;

  if (wordCount < 20) {
    return { score: 1, note: "Too brief to demonstrate structured reasoning." };
  }
  if (sentenceCount >= 3 && wordCount >= 40) {
    return { score: 4, note: "Well-organized with multiple developed points." };
  }
  if (sentenceCount >= 2) {
    return { score: 3, note: "Reasonably organized." };
  }
  return { score: 2, note: "Could be broken into clearer, more organized points." };
}

const EVIDENCE_MARKERS = [
  "for example",
  "for instance",
  "specifically",
  "in my experience",
  "i led",
  "i built",
  "i managed",
  "i worked on",
  "result",
  "outcome",
  "%",
];

function scoreEvidence(normalized: string): { score: number; note: string } {
  const hits = EVIDENCE_MARKERS.filter((marker) => normalized.includes(marker)).length;

  if (hits >= 2) {
    return { score: 4, note: "Backs claims with concrete examples or results." };
  }
  if (hits === 1) {
    return { score: 3, note: "Includes some concrete detail." };
  }
  return { score: 2, note: "Mostly general statements; add a specific example or result." };
}

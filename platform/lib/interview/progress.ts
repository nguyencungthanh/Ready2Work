export interface InterviewQuestionProgress {
  id: string;
  round_number: number;
  max_score?: number;
}

export interface ScoredInterviewAnswer {
  question_id: string;
  score: number | null;
}

/** Answers must cover this set exactly; extra answers cannot complete a session. */
export function summarizeInterview(
  questions: InterviewQuestionProgress[],
  answers: ScoredInterviewAnswer[],
) {
  const answersById = new Map(answers.map((answer) => [answer.question_id, answer]));
  if (
    questions.length === 0 ||
    answersById.size !== answers.length ||
    answers.length !== questions.length ||
    questions.some((question) => {
      const score = answersById.get(question.id)?.score;
      return typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100;
    })
  ) {
    throw new Error("Answer every question in this interview before finishing.");
  }

  const roundScores = [1, 2, 3].flatMap((round) => {
    const roundQuestions = questions.filter((question) => question.round_number === round);
    if (!roundQuestions.length) return [];
    const totalWeight = roundQuestions.reduce((sum, question) => sum + (question.max_score ?? 100), 0);
    if (totalWeight <= 0) throw new Error("This interview has an invalid scoring configuration.");
    const score = Math.round(roundQuestions.reduce((sum, question) =>
      sum + answersById.get(question.id)!.score! * (question.max_score ?? 100), 0) / totalWeight);
    return [{ round, score, questionCount: roundQuestions.length }];
  });

  return {
    roundScores,
    overallScore: Math.round(roundScores.reduce((sum, round) => sum + round.score, 0) / roundScores.length),
    hasThreeRounds: roundScores.length === 3,
  };
}

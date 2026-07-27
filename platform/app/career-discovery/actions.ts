"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  rankCareers,
  scoreAssessment,
  type CareerProfile,
  type RiasecDimension,
  type ScoredQuestion,
} from "@/lib/career/scoring";

const TOP_N = 3;

/** Starts a fresh attempt and sends the user to the questions. */
export async function startAssessmentAction(): Promise<void> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("assessment_attempts")
    .insert({ user_id: user.id, answers: {} })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Could not start the assessment. Please try again.");
  }

  redirect(`/career-discovery/${data.id}`);
}

/** Saves progress so a partially finished assessment can be resumed. */
export async function saveAnswersAction(
  attemptId: string,
  answers: Record<string, number>,
): Promise<void> {
  await requireUser();
  const supabase = await createServerSupabaseClient();

  // RLS restricts this to the owner's own attempt.
  await supabase.from("assessment_attempts").update({ answers }).eq("id", attemptId);
}

/**
 * Scores the attempt deterministically and stores the top career matches.
 * Scoring happens server-side so a client cannot submit its own scores.
 */
export async function submitAssessmentAction(
  attemptId: string,
  answers: Record<string, number>,
): Promise<void> {
  await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: questionRows } = await supabase
    .from("assessment_questions")
    .select("id, dimension");

  const questions: ScoredQuestion[] = (questionRows ?? []).map((row) => ({
    id: row.id as string,
    dimension: row.dimension as RiasecDimension,
  }));

  const answered = questions.filter((q) => typeof answers[q.id] === "number").length;
  if (answered < questions.length) {
    throw new Error("Please answer every question before submitting.");
  }

  const scores = scoreAssessment(questions, answers);

  const { data: careerRows } = await supabase
    .from("careers")
    .select(
      "id, realistic, investigative, artistic, social, enterprising, conventional",
    );

  const ranked = rankCareers(scores, (careerRows ?? []) as CareerProfile[]).slice(0, TOP_N);

  await supabase
    .from("assessment_attempts")
    .update({ answers, scores, submitted_at: new Date().toISOString() })
    .eq("id", attemptId);

  // Replace prior results so re-submitting an attempt stays idempotent.
  await supabase.from("career_recommendations").delete().eq("attempt_id", attemptId);
  await supabase.from("career_recommendations").insert(
    ranked.map((entry, index) => ({
      attempt_id: attemptId,
      career_id: entry.career.id,
      match_score: entry.score,
      rank: index + 1,
    })),
  );

  redirect(`/career-discovery/${attemptId}/results`);
}

/** Saves or unsaves a recommendation (the "Save Result" button). */
export async function toggleSaveRecommendationAction(
  recommendationId: string,
  saved: boolean,
): Promise<void> {
  await requireUser();
  const supabase = await createServerSupabaseClient();

  await supabase
    .from("career_recommendations")
    .update({ saved })
    .eq("id", recommendationId);
}

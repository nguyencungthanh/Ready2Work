"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { evaluateSubmission, type RubricCriterion } from "@/lib/simulation/evaluator";
import { logger } from "@/lib/observability/logger";

export interface FormState {
  error?: string;
}

/**
 * Scores and stores a simulation submission in one step (section 14.4/14.5).
 * The schema has no draft/attempt state - a submission is final once sent,
 * matching the feature spec's "user submits the work" -> "AI evaluates" flow.
 */
export async function submitSimulationAction(
  simulationId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const content = String(formData.get("content") ?? "").trim();

  if (content.length === 0) {
    return { error: "Write a response before submitting." };
  }

  const supabase = await createServerSupabaseClient();

  const { data: simulation } = await supabase
    .from("simulations")
    .select("rubric, min_words")
    .eq("id", simulationId)
    .maybeSingle();

  if (!simulation) {
    return { error: "This simulation could not be found." };
  }

  const rubric = (simulation.rubric ?? []) as RubricCriterion[];
  const result = evaluateSubmission(content, rubric, simulation.min_words);

  const { data: submission, error } = await supabase
    .from("simulation_submissions")
    .insert({
      user_id: user.id,
      simulation_id: simulationId,
      content,
      overall_score: result.overallScore,
      overall_band: result.overallBand,
      criterion_scores: result.criteria,
    })
    .select("id")
    .single();

  if (error || !submission) {
    logger.error("simulation_submit_failed", {
      operation: "submitSimulationAction",
      domain: "simulations",
      error_code: error?.code ?? "UNKNOWN",
    });
    return { error: "Something went wrong submitting your work. Please try again." };
  }

  redirect(`/simulations/submissions/${submission.id}`);
}

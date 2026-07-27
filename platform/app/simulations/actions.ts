"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { evaluateSubmissionWithAI, type RubricCriterion } from "@/lib/simulation/ai-evaluator";
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
    .select("brief, task_instructions, rubric, min_words")
    .eq("id", simulationId)
    .maybeSingle();

  if (!simulation) {
    return { error: "This simulation could not be found." };
  }

  const rubric = (simulation.rubric ?? []) as RubricCriterion[];

  let result;
  try {
    result = await evaluateSubmissionWithAI(
      content,
      simulation.brief,
      simulation.task_instructions,
      rubric,
      simulation.min_words,
    );
  } catch (err) {
    logger.error("simulation_evaluation_failed", {
      operation: "submitSimulationAction",
      domain: "simulations",
      error_code: err instanceof Error ? err.message : "UNKNOWN",
    });
    return { error: "Could not score your submission right now. Please try again." };
  }

  const { data: submission, error } = await supabase
    .from("simulation_submissions")
    .insert({
      user_id: user.id,
      simulation_id: simulationId,
      content,
      overall_score: result.overallScore,
      overall_band: result.overallBand,
      criterion_scores: { summary: result.summary, criteria: result.criteria },
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

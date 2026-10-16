import "server-only";
import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateReadiness, newestBy } from "./scoring";

export interface SimulationCatalogRow {
  id: string; slug: string; industry: string; position_title: string; position_id: string | null;
}
export interface RecordedCriterion {
  label: string; skill?: string; score: number; maxScore: number; feedback?: string; note?: string;
}
export interface SimulationHistoryRow {
  id: string; simulation_id: string; overall_score: number | null; submitted_at: string;
  criterion_scores: { summary?: string; criteria?: RecordedCriterion[] } | null;
}
export interface InterviewCatalogRow {
  id: string; slug: string; position_title: string; industry: string; position_id: string | null; is_available: boolean;
}
export interface InterviewHistoryRow {
  id: string; set_id: string; created_at: string; completed_at: string | null; overall_score: number | null;
  round_scores: { round: number; score: number; questionCount: number }[] | null;
}
interface CvResult {
  overallMatchScore?: number; summary?: string; provider?: string;
  strengths?: { skillName: string; candidateEvidence: string }[];
  skillGaps?: { skillName: string; gapDescription: string; recommendedAction?: string }[];
}
interface CvAnalysis { id: string; position_id: string; position_title: string; result: CvResult; created_at: string }
interface Roadmap { id: string; created_at: string; roadmap_steps: { id: string; completed: boolean }[] }
interface MentorReview { position_id: string; score: number; created_at: string }

/** Request-local memoization only: private user history never enters a shared cache. */
export const getCandidateOverview = cache(async (userId: string) => {
  const supabase = await createServerSupabaseClient();
  const results = await Promise.all([
    supabase.from("simulations").select("id, slug, industry, position_title, position_id").order("industry"),
    supabase.from("candidate_latest_simulation_submissions").select("id, simulation_id, overall_score, criterion_scores, submitted_at")
      .eq("user_id", userId).order("submitted_at", { ascending: false }),
    supabase.from("interview_sets").select("id, slug, position_title, industry, position_id, is_available"),
    supabase.from("interview_sessions").select("id, set_id, created_at, completed_at, overall_score, round_scores")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("roadmaps").select("id, created_at, roadmap_steps(id, completed)")
      .eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("cv_analyses").select("id, position_id, position_title, result, created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(1),
    supabase.from("candidate_latest_mentor_reviews").select("position_id, score, created_at")
      .eq("candidate_id", userId).order("created_at", { ascending: false }),
    supabase.from("candidate_completed_interview_sessions").select("id, set_id, created_at, completed_at, overall_score, round_scores")
      .eq("user_id", userId).order("completed_at", { ascending: false }),
  ]);
  // A missing migration/failed query must not masquerade as a new empty account.
  const failure = results.find((result) => result.error);
  if (failure?.error) throw new Error("Could not load your recorded progress. Check the database connection and apply the integration migration.");
  const simulations = (results[0]!.data ?? []) as SimulationCatalogRow[];
  const submissions = (results[1]!.data ?? []) as SimulationHistoryRow[];
  const interviewSets = (results[2]!.data ?? []) as InterviewCatalogRow[];
  const sessions = (results[3]!.data ?? []) as InterviewHistoryRow[];
  const roadmaps = (results[4]!.data ?? []) as unknown as Roadmap[];
  const cv = ((results[5]!.data ?? []) as CvAnalysis[])[0] ?? null;
  const mentorReviews = (results[6]!.data ?? []) as MentorReview[];
  const completedSessions = (results[7]!.data ?? []) as InterviewHistoryRow[];
  const latestSubmissions = newestBy(submissions, (row) => row.simulation_id);
  const latestSubmissionRole = simulations.find((simulation) => simulation.id === submissions[0]?.simulation_id);
  const latestInterviewRole = interviewSets.find((set) => set.id === sessions[0]?.set_id);
  const target = cv ? { id: cv.position_id, title: cv.position_title } : latestSubmissionRole
    ? { id: latestSubmissionRole.position_id, title: latestSubmissionRole.position_title }
    : latestInterviewRole ? { id: latestInterviewRole.position_id, title: latestInterviewRole.position_title } : null;
  const sameRole = (row: { position_id: string | null; position_title: string }) => Boolean(target &&
    (target.id ? row.position_id === target.id : row.position_title === target.title));
  const targetSimulations = simulations.filter(sameRole);
  const targetSets = interviewSets.filter(sameRole);
  const targetSimulationIds = new Set(targetSimulations.map((simulation) => simulation.id));
  const targetSetIds = new Set(targetSets.map((set) => set.id));
  const targetSubmissions = latestSubmissions.filter((submission) => targetSimulationIds.has(submission.simulation_id) && submission.overall_score !== null);
  const completedInterview = completedSessions.find((session) => targetSetIds.has(session.set_id) && session.completed_at && session.overall_score !== null && session.round_scores?.length === 3);
  const mentor = target?.id ? mentorReviews.find((review) => review.position_id === target.id) : null;
  const completion = targetSimulations.length ? Math.round(targetSubmissions.length / targetSimulations.length * 100) : null;
  const readiness = calculateReadiness(completion, completedInterview?.overall_score ?? null, mentor?.score ?? null);
  const steps = roadmaps.flatMap((roadmap) => roadmap.roadmap_steps ?? []);
  const completedSteps = steps.filter((step) => step.completed).length;
  const availableSets = interviewSets.filter((set) => set.is_available);
  const availableSetIds = new Set(availableSets.map((set) => set.id));
  const completedSetIds = new Set(completedSessions.filter((session) => availableSetIds.has(session.set_id)).map((session) => session.set_id));
  const completedIndustries = new Set(latestSubmissions.map((submission) => simulations.find((simulation) => simulation.id === submission.simulation_id)?.industry).filter(Boolean));
  const recommendations = simulations.filter((simulation) => completedIndustries.has(simulation.industry) && !latestSubmissions.some((submission) => submission.simulation_id === simulation.id)).slice(0, 4);
  const allCriteria: RecordedCriterion[] = targetSubmissions.flatMap((submission) => submission.criterion_scores?.criteria ?? []);
  if (completedInterview) {
    const { data: answers, error } = await supabase.from("interview_answers").select("criteria").eq("session_id", completedInterview.id);
    if (error) throw new Error("Could not load your interview assessment details.");
    for (const answer of answers ?? []) allCriteria.push(...((answer.criteria ?? []) as RecordedCriterion[]));
  }
  const skills = new Map<string, { sum: number; count: number; notes: string[] }>();
  for (const criterion of allCriteria) {
    if (!Number.isFinite(criterion.score) || !(criterion.maxScore > 0)) continue;
    const label = criterion.skill || criterion.label;
    const prior = skills.get(label) ?? { sum: 0, count: 0, notes: [] };
    prior.sum += criterion.score / criterion.maxScore * 100;
    prior.count++;
    if (criterion.feedback || criterion.note) prior.notes.push(criterion.feedback || criterion.note!);
    skills.set(label, prior);
  }
  const measuredSkills = Array.from(skills.entries()).map(([label, value]) => ({ label, score: Math.round(value.sum / value.count), notes: value.notes }));
  const strengths = [...(cv?.result.strengths ?? []).map((row) => `${row.skillName}: ${row.candidateEvidence}`),
    ...measuredSkills.filter((skill) => skill.score >= 75).flatMap((skill) => skill.notes.slice(0, 1))].slice(0, 5);
  const gaps = [...(cv?.result.skillGaps ?? []).map((row) => `${row.skillName}: ${row.gapDescription}${row.recommendedAction ? ` ${row.recommendedAction}` : ""}`),
    ...measuredSkills.filter((skill) => skill.score < 60).flatMap((skill) => skill.notes.slice(0, 1))].slice(0, 5);
  return { simulations, submissions, latestSubmissions, interviewSets, sessions, roadmaps, cv, target,
    targetSimulations, targetSubmissions, completedInterview, mentor, completion, readiness,
    measuredSkills, strengths, gaps, recommendations, progress: {
      roadmap: { completed: completedSteps + (cv ? 1 : 0), total: steps.length + 1, percent: Math.round((completedSteps + (cv ? 1 : 0)) / (steps.length + 1) * 100) },
      simulation: { completed: latestSubmissions.filter((row) => row.overall_score !== null).length, total: simulations.length, percent: simulations.length ? Math.round(latestSubmissions.filter((row) => row.overall_score !== null).length / simulations.length * 100) : 0 },
      interview: { completed: completedSetIds.size, total: availableSets.length, percent: availableSets.length ? Math.round(completedSetIds.size / availableSets.length * 100) : 0 },
    } };
});

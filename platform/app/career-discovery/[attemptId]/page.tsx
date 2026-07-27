import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AssessmentForm } from "./assessment-form";

export const metadata = { title: "Assessment" };
export const dynamic = "force-dynamic";

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: attempt } = await supabase
    .from("assessment_attempts")
    .select("id, answers, submitted_at")
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt) notFound();
  if (attempt.submitted_at) redirect(`/career-discovery/${attemptId}/results`);

  const { data: questions } = await supabase
    .from("assessment_questions")
    .select("id, position, prompt")
    .order("position");

  return (
    <AssessmentForm
      attemptId={attempt.id}
      questions={questions ?? []}
      initialAnswers={(attempt.answers as Record<string, number>) ?? {}}
    />
  );
}

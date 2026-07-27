import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { startInterviewSessionAction } from "../actions";

/** Interview set overview - shows the question count before starting a session. */
export default async function InterviewSetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireUser();
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: set } = await supabase
    .from("interview_sets")
    .select("id, industry, position_title, company_name, description")
    .eq("slug", slug)
    .maybeSingle();

  if (!set) notFound();

  const { count } = await supabase
    .from("interview_questions")
    .select("id", { count: "exact", head: true })
    .eq("set_id", set.id);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-sm font-medium text-muted">{set.industry}</p>
      <h1 className="mt-1 text-2xl font-semibold text-foreground">
        {set.company_name ? `${set.company_name} - ` : ""}
        {set.position_title}
      </h1>
      <p className="mt-3 text-muted">{set.description}</p>

      <div className="mt-6 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        <p className="font-medium text-foreground">Before you start</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{count ?? 0} questions, answered by text.</li>
          <li>Scoring covers relevance, structure, evidence, and reasoning.</li>
          <li>Voice, accent, and identity are never scored.</li>
        </ul>
      </div>

      <form action={startInterviewSessionAction} className="mt-6">
        <input type="hidden" name="setId" value={set.id} />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors duration-200"
        >
          Start Interview
        </button>
      </form>
    </div>
  );
}

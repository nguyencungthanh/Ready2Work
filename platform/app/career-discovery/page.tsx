import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { startAssessmentAction } from "./actions";

export const metadata = { title: "Career Discovery" };

export default async function CareerDiscoveryPage() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: previous } = await supabase
    .from("assessment_attempts")
    .select("id, submitted_at")
    .eq("user_id", user.id)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count } = await supabase
    .from("assessment_questions")
    .select("id", { count: "exact", head: true });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-muted underline transition-colors duration-200">
        ← Dashboard
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-foreground">Career Discovery</h1>
      <p className="mt-2 text-sm text-muted">
        Answer {count ?? 30} short questions about how you like to work. We score your interests
        across six dimensions and match them against career profiles.
      </p>

      <div className="mt-6 rounded-lg border border-border p-5 text-sm text-muted">
        <h2 className="font-medium text-foreground">How scoring works</h2>
        <p className="mt-2">
          Your answers are scored with a fixed formula, not an AI guess, so the same answers always
          give the same result. You can see every factor behind your matches on the results page.
        </p>
      </div>

      {previous && (
        <p className="mt-6 text-sm text-muted">
          You completed this before.{" "}
          <Link
            href={`/career-discovery/${previous.id}/results`}
            className="font-medium text-primary underline transition-colors duration-200"
          >
            View your previous results
          </Link>
        </p>
      )}

      <form action={startAssessmentAction} className="mt-6">
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors duration-200"
        >
          Start Assessment
        </button>
      </form>
    </main>
  );
}

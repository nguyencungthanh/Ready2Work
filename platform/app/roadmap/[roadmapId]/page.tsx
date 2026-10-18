import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { completionPercent, ROADMAP_STAGES } from "@/lib/roadmap/generator";
import { StepToggle } from "./step-toggle";
import { RoadmapChat } from "./roadmap-chat";

export const metadata = { title: "Your roadmap" };
export const dynamic = "force-dynamic";

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ roadmapId: string }>;
}) {
  const { roadmapId } = await params;
  await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: roadmap } = await supabase
    .from("roadmaps")
    .select("id, careers (title, industry, key_skills)")
    .eq("id", roadmapId)
    .maybeSingle();

  if (!roadmap) notFound();

  const career = roadmap.careers as unknown as {
    title: string;
    industry: string;
    key_skills: string[];
  };

  const [{ data: steps }, { data: chatMessages }] = await Promise.all([
    supabase
      .from("roadmap_steps")
      .select("id, position, stage, title, objective, resource_label, resource_url, completed")
      .eq("roadmap_id", roadmapId)
      .order("position"),
    supabase
      .from("roadmap_chat_messages")
      .select("id, role, content")
      .eq("roadmap_id", roadmapId)
      .order("created_at").order("role", { ascending: false }),
  ]);

  const allSteps = steps ?? [];
  const percent = completionPercent(allSteps);
  const nextStep = allSteps.find((step) => !step.completed);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-muted underline transition-colors duration-200">
        ← Dashboard
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-foreground">
        Roadmap: {career?.title}
      </h1>
      <p className="mt-1 text-sm text-muted">{career?.industry}</p>

      <section className="mt-6 rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Overall progress</h2>
          <span className="text-sm font-medium text-foreground">{percent}%</span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Roadmap completion"
        >
          <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>

        {nextStep ? (
          <p className="mt-4 text-sm text-muted">
            <strong>Next up:</strong> {nextStep.title}
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted">
            Every step is complete. Well done.
          </p>
        )}
      </section>

      <section className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/simulations"
          className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-surface transition-colors duration-200"
        >
          Start Job Simulation
        </Link>
        <Link
          href="/interviews"
          className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-surface transition-colors duration-200"
        >
          Practice Interview
        </Link>
      </section>

      <section className="mt-10 space-y-8">
        {ROADMAP_STAGES.map((stage) => {
          const stageSteps = allSteps.filter((step) => step.stage === stage);
          if (stageSteps.length === 0) return null;

          return (
            <div key={stage}>
              <h2 className="text-lg font-medium text-foreground">{stage}</h2>
              <ul className="mt-3 space-y-3">
                {stageSteps.map((step) => (
                  <li
                    key={step.id}
                    className="flex items-start gap-3 rounded-2xl border border-border p-4 shadow-sm"
                  >
                    <StepToggle stepId={step.id} initialCompleted={step.completed} />
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          step.completed ? "text-muted line-through" : "text-foreground"
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="mt-1 text-sm text-muted">{step.objective}</p>
                      {step.resource_url && (
                        <Link
                          href={step.resource_url}
                          className="mt-2 inline-block text-sm font-medium text-primary underline transition-colors duration-200"
                        >
                          {step.resource_label}
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <RoadmapChat roadmapId={roadmapId} messages={chatMessages ?? []} />
    </main>
  );
}

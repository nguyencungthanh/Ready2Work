import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { RoadmapPlanner } from "./roadmap-planner";

export const metadata = { title: "Generate roadmap" };

export default async function NewRoadmapPage({
  searchParams,
}: {
  searchParams: Promise<{ careerId?: string }>;
}) {
  const { careerId } = await searchParams;
  await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: careers } = await supabase
    .from("careers")
    .select("id, title, industry, summary")
    .order("industry");

  const careerOptions = careers ?? [];
  const selected = careerId ? careerOptions.find((career) => career.id === careerId) : undefined;
  const initialCareerId = selected?.id ?? careerOptions[0]?.id ?? "";

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-muted underline transition-colors duration-200">
        ← Dashboard
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-foreground">Generate your roadmap</h1>
      <p className="mt-2 text-sm text-muted">
        Pick the career you want to prepare for. We build a staged plan from that career&apos;s
        required skills, so you can see exactly why each step is there.
      </p>

      <RoadmapPlanner careers={careerOptions} initialCareerId={initialCareerId} />
    </main>
  );
}

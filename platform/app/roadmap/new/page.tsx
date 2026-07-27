import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateRoadmapAction } from "../actions";

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

  const selected = careerId ? careers?.find((c) => c.id === careerId) : undefined;

  async function generate(formData: FormData) {
    "use server";
    const id = formData.get("careerId");
    if (typeof id === "string") {
      await generateRoadmapAction(id);
    }
  }

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

      <form action={generate} className="mt-8 space-y-4">
        <div>
          <label htmlFor="careerId" className="block text-sm font-medium text-foreground">
            Target career
          </label>
          <select
            id="careerId"
            name="careerId"
            defaultValue={selected?.id ?? ""}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
          >
            {(careers ?? []).map((career) => (
              <option key={career.id} value={career.id}>
                {career.title} — {career.industry}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-md transition-all duration-300"
        >
          Generate Roadmap
        </button>
      </form>
    </main>
  );
}

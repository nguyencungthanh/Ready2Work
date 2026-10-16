import { AppShell } from "@/components/app-shell";
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
  const user = await requireUser();
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: set } = await supabase
    .from("interview_sets")
    .select("id, industry, position_title, company_name, description, is_available")
    .eq("slug", slug)
    .maybeSingle();

  if (!set) notFound();

  const { count } = await supabase
    .from("interview_questions")
    .select("id", { count: "exact", head: true })
    .eq("set_id", set.id);

  return (
    <AppShell active="interviews" displayName={user.displayName}><main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-medium text-muted">{set.industry}</p>
      <h1 className="mt-1 text-2xl font-bold text-foreground">
        {set.company_name ? `${set.company_name} - ` : ""}
        {set.position_title}
      </h1>
      <p className="mt-3 text-muted">{set.description}</p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-4 text-sm text-muted shadow-sm">
        <p className="font-medium text-foreground">Before you start</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{count ?? 0} questions, answered by text.</li>
          <li>Ba vòng: tổng quan, chuyên môn và tình huống. Mỗi vòng được quy đổi về 100 điểm.</li>
          <li>Câu trả lời được chấm theo tiêu chí riêng của từng câu hỏi.</li>
          <li>Voice, accent, and identity are never scored.</li>
        </ul>
      </div>

      {!set.is_available && <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Bộ câu hỏi gốc chưa có đủ ba vòng. Nội dung sẽ được mở khi hoàn tất; hệ thống không tự tạo câu hỏi hoặc điểm thay thế.</p>}
      <form action={startInterviewSessionAction} className="mt-6">
        <input type="hidden" name="setId" value={set.id} />
        <button
          type="submit"
          disabled={!set.is_available}
          className="disabled:opacity-40 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-md transition-all duration-300"
        >
          Start Interview
        </button>
      </form>
    </main></AppShell>
  );
}

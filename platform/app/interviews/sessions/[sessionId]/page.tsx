import { AppShell } from "@/components/app-shell";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FinishForm } from "./finish-form";
import { AnswerForm } from "./answer-form";
import Link from "next/link";
import { practiceExpired } from "@/lib/practice-time";

export const dynamic = "force-dynamic";

/**
 * One question at a time (Feature 4 user flow step 3-4: "Answer by Text").
 * Shows the first unanswered question; once all are answered, shows a
 * Finish button that scores the session (evaluateInterviewAnswer already
 * ran per-answer, so completing just averages the stored scores).
 */
export default async function InterviewSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const user = await requireUser();
  const { sessionId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: session } = await supabase
    .from("interview_sessions")
    .select("id, user_id, set_id, completed_at, created_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.user_id !== user.id) notFound();
  if (session.completed_at) {
    redirect(`/interviews/sessions/${sessionId}/feedback`);
  }

  const [{ data: questions }, { data: answered }] = await Promise.all([
    supabase
      .from("interview_questions")
      .select("id, position, prompt, round_number")
      .eq("set_id", session.set_id)
      .order("round_number").order("position"),
    supabase.from("interview_answers").select("question_id").eq("session_id", sessionId),
  ]);

  const answeredIds = new Set((answered ?? []).map((a) => a.question_id));
  const next = (questions ?? []).find((q) => !answeredIds.has(q.id));
  const total = questions?.length ?? 0;

  if (!next) {
    return (
      <AppShell active="interviews" displayName={user.displayName}><main className="interview-room mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-xl font-bold text-foreground">Bạn đã trả lời tất cả câu hỏi</h1>
        <p className="mt-2 text-sm text-muted">
          Bạn đã hoàn thành {total} câu hỏi. Kết thúc buổi phỏng vấn để xem báo cáo đánh giá.
        </p>
        <FinishForm sessionId={sessionId}/>
      </main></AppShell>
    );
  }

  const currentIndex = (questions ?? []).findIndex((q) => q.id === next.id);

  if (practiceExpired(session.created_at)) return <AppShell active="interviews" displayName={user.displayName}><main className="d-main"><h1 className="text-xl font-bold">Buổi phỏng vấn đã hết giờ</h1><p className="my-4">Đã hết 60 phút. Buổi phỏng vấn đã dừng, không nhận thêm câu trả lời. Các câu đã nộp vẫn được giữ trong lịch sử.</p><p className="mb-4">Đã lưu {answeredIds.size}/{total} câu trả lời.</p><Link className="reference-link" href="/interviews">Quay lại lịch sử phỏng vấn →</Link></main></AppShell>;

  return <AppShell active="interviews" displayName={user.displayName}><main className="d-main"><div id="dash-tab-interview"><div className="iv-page-screen iv-active"><AnswerForm key={next.id} sessionId={sessionId} questionId={next.id} prompt={next.prompt} round={next.round_number} index={currentIndex} total={total} startedAt={session.created_at}/></div></div></main></AppShell>;
}

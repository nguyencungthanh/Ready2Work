import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { publicPositionCatalog } from "@/lib/content/catalog";
import type { CVAnalysis } from "@/lib/cv/analyzer";
import { AppShell } from "@/components/app-shell";
import { CVForm } from "./cv-form";

export const metadata = { title: "Lộ trình AI · Ready2Work" };
export default async function CVPage() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const { data: analyses, error } = await supabase.from("cv_analyses")
    .select("id, position_id, position_title, file_name, file_path, result, created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
  return <AppShell active="roadmap" displayName={user.displayName}><main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
    <div className="mb-8"><p className="text-sm font-semibold uppercase tracking-widest text-primary">Lộ trình AI</p>
      <h1 className="mt-2 text-3xl font-bold">Hiểu năng lực. Chọn bước đi tiếp theo.</h1>
      <p className="mt-3 max-w-2xl text-muted">Đối chiếu CV với Golden Profile riêng của từng vị trí, nhận diện điểm mạnh và luyện tập qua công việc thực tế.</p></div>
    {error && <p role="alert" className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Chưa tải được lịch sử phân tích. Vui lòng thử lại sau khi hệ thống dữ liệu sẵn sàng.</p>}
    <CVForm positions={publicPositionCatalog()} />
    <section className="mt-10 space-y-6"><h2 className="text-xl font-bold">Phân tích đã lưu</h2>
      {!error && !analyses?.length && <p className="text-muted">Bạn chưa có phân tích CV. Kết quả sẽ xuất hiện ở đây và trong báo cáo năng lực.</p>}
      {(analyses ?? []).map((analysis) => {
        const result = analysis.result as CVAnalysis;
        return <article key={analysis.id} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-lg font-bold">{analysis.position_title}</h3>
            <p className="mt-1 text-sm text-muted">{new Date(analysis.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} · {result.provider === "ai" ? "Phân tích AI" : "Đối chiếu từ khóa"}</p></div>
            <p className="text-3xl font-bold text-primary">{result.overallMatchScore}<span className="text-sm text-muted">/100</span></p></div>
          <p className="mt-4 text-sm text-muted">{result.summary}</p>
          <div className="mt-6 grid gap-6 md:grid-cols-2"><div><h4 className="font-semibold text-teal-800">Điểm mạnh thể hiện trên CV</h4>
            <ul className="mt-3 space-y-3 text-sm">{result.strengths.map((f) => <li key={f.skillName}><strong>{f.skillName}</strong><p className="mt-1 text-muted">{f.candidateEvidence}</p></li>)}</ul>
            {!result.strengths.length && <p className="mt-3 text-sm text-muted">Chưa xác định được bằng chứng rõ ràng.</p>}</div>
            <div><h4 className="font-semibold text-blue-900">Ưu tiên cải thiện</h4><ul className="mt-3 space-y-3 text-sm">{result.skillGaps.slice(0, 5).map((f) => <li key={f.skillName}><strong>{f.skillName}</strong><p className="mt-1 text-muted">{f.gapDescription}</p><p className="mt-1">{f.recommendedAction}</p></li>)}</ul></div></div>
          <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-primary"><Link href={`/simulations?position=${encodeURIComponent(analysis.position_id)}`}>Luyện tập mô phỏng phù hợp →</Link>
            <Link href={`/interviews?position=${encodeURIComponent(analysis.position_id)}`}>Luyện phỏng vấn →</Link>
            {analysis.file_path && <a href={`/api/cv-file?id=${analysis.id}`}>Tải CV đã lưu</a>}</div>
        </article>;
      })}
    </section>
  </main></AppShell>;
}

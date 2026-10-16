import { requireUser, hasRole } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { publicPositionCatalog } from "@/lib/content/catalog";
import { AppShell } from "@/components/app-shell";
import { CompanyForm, ContentForm } from "./forms";
import { publishBusinessContentAction } from "./actions";
export const metadata = { title: "Doanh nghiệp · Ready2Work" };

export default async function BusinessPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser();
  const { tab } = await searchParams;
  const kind = tab === "interview" ? "interview" : "simulation";
  const client = await createServerSupabaseClient();
  const [{ data: company, error: companyError }, { data: items, error: contentError }] = await Promise.all([
    client.from("company_profiles").select("name, website, industry, contact_name").eq("user_id", user.id).maybeSingle(),
    client.from("employer_content").select("id, kind, title, status, position_id, assignment_name, rubric_name, created_at").eq("owner_id", user.id).eq("kind", kind).order("created_at", { ascending: false }).limit(100),
  ]);
  const approved = hasRole(user, "employer_admin", "employer_member", "admin", "super_admin");
  return <AppShell active="business" displayName={user.displayName}><main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
    <p className="text-sm font-semibold uppercase tracking-widest text-primary">Không gian doanh nghiệp</p><h1 className="mt-2 text-3xl font-bold">{company?.name ?? "Kết nối nhân tài qua trải nghiệm thật"}</h1>
    <p className="mt-3 max-w-2xl text-muted">Quản lý đề bài và tiêu chí đánh giá cho mô phỏng công việc và luyện phỏng vấn.</p>
    {(companyError || contentError) && <p role="alert" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Chưa tải được dữ liệu doanh nghiệp. Vui lòng thử lại khi hệ thống dữ liệu sẵn sàng.</p>}
    {company && !approved && <p className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">Đang chờ xác minh doanh nghiệp. Bạn có thể lưu và tải xuống bản nháp; quyền xuất bản sẽ được mở sau khi quản trị viên duyệt yêu cầu.</p>}
    <details open={!company} className="mt-8"><summary className="mb-4 cursor-pointer text-lg font-bold">Hồ sơ doanh nghiệp</summary><CompanyForm company={company} /></details>
    {company && <><section className="mt-10"><h2 className="mb-4 text-xl font-bold">Tải nội dung mới</h2><ContentForm positions={publicPositionCatalog()} /></section>
      <section className="mt-10"><h2 className="text-xl font-bold">Nội dung của doanh nghiệp</h2>
        <nav aria-label="Nhóm nội dung" className="my-5 flex gap-3"><a aria-current={kind === "simulation" ? "page" : undefined} href="/business?tab=simulation" className={`rounded-full px-5 py-2 text-sm font-semibold ${kind === "simulation" ? "bg-primary text-white" : "border border-border bg-white"}`}>Mô phỏng việc làm</a><a aria-current={kind === "interview" ? "page" : undefined} href="/business?tab=interview" className={`rounded-full px-5 py-2 text-sm font-semibold ${kind === "interview" ? "bg-primary text-white" : "border border-border bg-white"}`}>Luyện phỏng vấn</a></nav>
        {!contentError && !items?.length && <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted">Chưa có nội dung trong nhóm này.</p>}
        <div className="space-y-4">{items?.map((item) => <article key={item.id} className="rounded-2xl border border-border bg-white p-6"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-bold">{item.title}</h3><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{item.status === "published" ? "Đã xuất bản" : "Bản nháp"}</span></div>
          <p className="mt-2 text-xs text-muted">{item.position_id} · {new Date(item.created_at).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>
          <div className="mt-5 flex flex-wrap items-center gap-5 text-sm font-semibold text-primary"><a href={`/api/business-file?id=${item.id}&file=assignment`}>Tải đề bài</a><a href={`/api/business-file?id=${item.id}&file=rubric`}>Tải tiêu chí</a>
            {approved && item.status !== "published" && <form action={publishBusinessContentAction}><input type="hidden" name="id" value={item.id} /><button className="rounded-lg bg-primary px-4 py-2 text-white">Xuất bản cho ứng viên</button></form>}</div>
        </article>)}</div>
      </section></>}
  </main></AppShell>;
}

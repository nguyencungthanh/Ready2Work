import { InterviewCatalog, type InterviewActivity } from "@/components/reference/interview-catalog";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Feature 4 catalog: choose an industry, then a general or company-specific set. */
export default async function InterviewsPage({ searchParams }: { searchParams: Promise<{ position?: string;explore?:string }> }) {
  const user = await requireUser();
  const filters = await searchParams;
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("interview_sets")
    .select("id, slug, industry, position_title, company_name, description, is_available, unavailable_reason, position_id")
    .order("industry");
  if (filters.position) query = query.eq("position_id", filters.position);
  const { data: sets, error } = await query;
  if (error) throw new Error("Could not load interview questions. Please try again.");

  const {data:activity,error:activityError}=await supabase.from("interview_sessions").select("id,set_id,created_at,completed_at,overall_score,round_scores").eq("user_id",user.id).order("created_at",{ascending:false}).limit(10);
  return <AppShell active="interviews" displayName={user.displayName}>
    {activityError&&<p role="alert" className="auth-error">Chưa tải được lịch sử phỏng vấn. Vui lòng thử lại.</p>}<InterviewCatalog items={sets ?? []} filtered={Boolean(filters.position||filters.explore)} activity={(activity??[]) as InterviewActivity[]} />
  </AppShell>;
}

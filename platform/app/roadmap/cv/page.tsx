import { aiProviderLabel } from "@/lib/ai/config";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { publicPositionCatalog,getGoldenProfile } from "@/lib/content/catalog";
import { AppShell } from "@/components/app-shell";
import { CVWorkspace } from "./cv-workspace";
import type { SavedCV } from "./cv-results";
export const metadata={title:"Lộ trình AI · Ready2Work"};
export const maxDuration = 180;
export default async function CVPage(){const user=await requireUser();const supabase=await createServerSupabaseClient();const {data:analyses,error}=await supabase.from("cv_analyses").select("id,position_id,position_title,file_name,file_path,result,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(10);return <AppShell active="roadmap" displayName={user.displayName}><main className="d-main">{error&&<p role="alert" className="auth-error">Chưa tải được lịch sử phân tích CV. Vui lòng thử lại.</p>}<CVWorkspace providerLabel={aiProviderLabel()} positions={publicPositionCatalog()} analyses={((analyses??[]) as SavedCV[]).map(a=>{const profile=getGoldenProfile(a.position_id);return {...a,industryName:profile?.industry_name,requiredLevels:profile?Object.fromEntries([...profile.hard_skills,...profile.tools,...profile.soft_skills,...profile.certifications].map(r=>[r.skill||r.tool||r.name||"",r.required_level||r.priority||"Theo yêu cầu vị trí"])):{}}})}/></main></AppShell>;}

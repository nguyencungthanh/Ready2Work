"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, hasRole } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { extractCVText } from "@/lib/cv/extract";
import { getGoldenProfile } from "@/lib/content/catalog";
import { rubricSchema, interviewAssignmentSchema, interviewRubricSchema } from "@/lib/content/business-schema";

export interface BusinessState { error?: string; success?: string }
const companySchema = z.object({
  name: z.string().trim().min(2).max(180), industry: z.string().trim().min(2).max(120),
  website: z.string().trim().url().startsWith("https://").max(250).or(z.literal("")),
  contact_name: z.string().trim().min(2).max(150),
});

export async function saveCompanyAction(_previous: BusinessState, formData: FormData): Promise<BusinessState> {
  const user = await requireUser();
  const parsed = companySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Vui lòng nhập đủ tên công ty, lĩnh vực, người liên hệ và website HTTPS hợp lệ (nếu có)." };
  const client = await createServerSupabaseClient();
  const { error } = await client.from("company_profiles").upsert({ user_id: user.id, ...parsed.data }, { onConflict: "user_id" });
  if (error) return { error: "Chưa lưu được hồ sơ doanh nghiệp. Vui lòng thử lại." };
  if (!hasRole(user, "employer_admin", "employer_member", "admin", "super_admin")) {
    // A pending role only selects the business workspace; it grants no publish rights.
    const { error: pendingError } = await createServiceRoleClient().from("user_roles").upsert({ user_id: user.id, role: "employer_pending" }, { onConflict: "user_id,role" });
    if (pendingError) return { error: "Đã lưu hồ sơ nhưng chưa ghi nhận được trạng thái doanh nghiệp. Vui lòng thử lại." };
    const { data: existing } = await client.from("role_applications").select("id").eq("user_id", user.id).eq("requested_role", "employer_admin").in("status", ["submitted", "under_review"]).limit(1);
    if (!existing?.length) {
      const { error: applicationError } = await client.from("role_applications").insert({ user_id: user.id, requested_role: "employer_admin", justification: `Doanh nghiệp: ${parsed.data.name}. Website: ${parsed.data.website}. Liên hệ: ${parsed.data.contact_name}. Email tài khoản: ${user.email}.` });
      if (applicationError) return { error: "Đã lưu hồ sơ nhưng chưa gửi được yêu cầu xác minh. Vui lòng thử lại." };
    }
  }
  revalidatePath("/business");
  return { success: "Đã lưu hồ sơ. Doanh nghiệp có thể quản lý bản nháp trong khi chờ xác minh quyền đăng tải." };
}

export async function uploadBusinessContentAction(_previous: BusinessState, formData: FormData): Promise<BusinessState> {
  const user = await requireUser();
  const client = await createServerSupabaseClient();
  const { data: company } = await client.from("company_profiles").select("name").eq("user_id", user.id).maybeSingle();
  if (!company) return { error: "Vui lòng hoàn thành hồ sơ doanh nghiệp trước." };
  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");
  const profile = getGoldenProfile(String(formData.get("positionId") ?? ""));
  const assignment = formData.get("assignment"), rubric = formData.get("rubric");
  if (title.length < 5 || title.length > 200 || !["simulation", "interview"].includes(kind) || !profile) return { error: "Vui lòng nhập tiêu đề, loại nội dung và vị trí hợp lệ." };
  if (!(assignment instanceof File) || !(rubric instanceof File) || !assignment.size || !rubric.size || assignment.size > 3 * 1024 * 1024 || rubric.size > 200_000) return { error: "Cần cả đề bài (tối đa 3 MB) và tiêu chí JSON (tối đa 200 KB)." };
  const uploadedPaths: string[] = [];
  try {
    const rubricText = await rubric.text();
    const rubricData = kind === "simulation" ? rubricSchema.parse(JSON.parse(rubricText)) : interviewRubricSchema.parse(JSON.parse(rubricText));
    const assignmentData = kind === "interview" ? interviewAssignmentSchema.parse(JSON.parse(await assignment.text())) : await extractCVText(assignment);
    if (typeof assignmentData !== "string") {
      const interviewRubric = interviewRubricSchema.parse(rubricData);
      const expected = assignmentData.rounds.flatMap((r) => r.questions.map((_, index) => `${r.roundNumber}-${index + 1}`));
      if (expected.length !== interviewRubric.length || expected.some((key) => !interviewRubric.some((r) => `${r.roundNumber}-${r.questionIndex}` === key))) throw new Error("Bộ tiêu chí phải khớp chính xác với mọi câu hỏi trong ba vòng.");
    }
    const id = crypto.randomUUID();
    const paths = [`${user.id}/${id}/assignment.${kind === "interview" ? "json" : assignment.name.split(".").pop()?.toLowerCase()}`, `${user.id}/${id}/rubric.json`];
    for (const [index, file] of [assignment, rubric].entries()) {
      const path = paths[index]!;
      const { error } = await client.storage.from("business-documents").upload(path, file, { upsert: false });
      if (error) throw new Error("Không tải được tệp. Vui lòng thử lại.");
      uploadedPaths.push(path);
    }
    const { error } = await createServiceRoleClient().from("employer_content").insert({
      id, owner_id: user.id, kind, title, position_id: profile.position_id, industry: profile.industry_name,
      assignment_path: paths[0], rubric_path: paths[1], assignment_name: assignment.name.slice(0, 200), rubric_name: rubric.name.slice(0, 200),
      assignment_data: assignmentData, rubric_data: rubricData,
    });
    if (error) throw new Error("Không lưu được cặp đề bài và tiêu chí.");
    revalidatePath("/business");
    return { success: "Đã lưu đề bài và tiêu chí vào đúng nhóm nội dung." };
  } catch (error) {
    if (uploadedPaths.length) await client.storage.from("business-documents").remove(uploadedPaths);
    const message = error instanceof Error ? error.message : "";
    return { error: /^(Không tải|Không lưu|Bộ tiêu chí|Chỉ hỗ trợ|Không đọc|Tệp|Nội dung CV|CV )/.test(message) ? message : "Tệp chưa đúng mẫu. Vui lòng dùng các mẫu bên dưới; tổng trọng số tiêu chí mỗi câu/bài phải bằng 100." };
  }
}

export async function publishBusinessContentAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!hasRole(user, "employer_admin", "employer_member", "admin", "super_admin")) throw new Error("Doanh nghiệp cần được xác minh trước khi xuất bản.");
  const client = await createServerSupabaseClient();
  const id = z.string().uuid().parse(formData.get("id"));
  const [{ data: item }, { data: company }] = await Promise.all([
    client.from("employer_content").select("*").eq("id", id).eq("owner_id", user.id).maybeSingle(),
    client.from("company_profiles").select("name").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!item || !company || item.status === "published") return;
  const admin = createServiceRoleClient();
  // Publish via a transaction: catalog + questions + paired upload status all succeed or all roll back.
  const { error } = await admin.rpc("publish_employer_content", { content_id: id, actor_id: user.id });
  if (error) throw new Error("Chưa xuất bản được nội dung. Vui lòng thử lại.");
  revalidatePath("/business"); revalidatePath("/simulations"); revalidatePath("/interviews");
}

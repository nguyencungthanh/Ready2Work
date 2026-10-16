import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.accountStatus !== "active") return new Response("Unauthorized", { status: 401 });
  const params = new URL(request.url).searchParams;
  const column = params.get("file") === "rubric" ? "rubric_path" : "assignment_path";
  const client = await createServerSupabaseClient();
  const { data } = await client.from("employer_content").select("assignment_path, rubric_path").eq("id", params.get("id") ?? "").eq("owner_id", user.id).maybeSingle();
  if (!data) return new Response("Not found", { status: 404 });
  const { data: signed, error } = await client.storage.from("business-documents").createSignedUrl(data[column], 60, { download: true });
  if (error || !signed) return new Response("Unavailable", { status: 503 });
  return new Response(null, { status: 302, headers: { Location: signed.signedUrl, "Cache-Control": "private, no-store" } });
}

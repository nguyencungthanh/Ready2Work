import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.accountStatus !== "active") return new Response("Unauthorized", { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("cv_analyses").select("file_path").eq("id", id ?? "").eq("user_id", user.id).maybeSingle();
  if (!data?.file_path) return new Response("Not found", { status: 404 });
  const { data: signed, error } = await supabase.storage.from("candidate-cvs").createSignedUrl(data.file_path, 60, { download: true });
  if (error || !signed) return new Response("Unavailable", { status: 503 });
  return new Response(null, { status: 302, headers: { Location: signed.signedUrl, "Cache-Control": "private, no-store" } });
}

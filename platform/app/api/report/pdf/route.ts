import { getSessionUser } from "@/lib/auth/session";
import { getCandidateOverview } from "@/lib/report/data";

export const runtime = "nodejs";
export const maxDuration = 30;

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response("Vui lòng đăng nhập để tải báo cáo.", { status: 401, headers });
  if (user.accountStatus !== "active") return new Response("Tài khoản chưa thể xuất báo cáo.", { status: 403, headers });
  try {
    // Only the verified session selects the report owner. No user ID from the request is used.
    const data = await getCandidateOverview(user.id);
    const { renderReportPdf } = await import("@/lib/report/pdf");
    const generatedAt = new Date();
    const pdf = await renderReportPdf(user, data, generatedAt);
    return new Response(new Uint8Array(pdf), { headers: {
      ...headers,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Ready2Work-Report-${generatedAt.toISOString().slice(0, 10)}.pdf"`,
    } });
  } catch {
    return new Response("Chưa tạo được báo cáo. Vui lòng thử lại sau.", { status: 503, headers });
  }
}

import { requireRole } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { ApplicationDecisionForm } from "./decision-form";

export const metadata = { title: "Role applications" };

export default async function RoleApplicationsPage() {
  await requireRole("admin", "super_admin");

  const service = createServiceRoleClient();
  const { data: applications } = await service
    .from("role_applications")
    .select("id, user_id, requested_role, status, justification, created_at")
    .in("status", ["submitted", "under_review"])
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold text-foreground">Role applications</h1>

      {(applications ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-muted">Nothing waiting for review.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {(applications ?? []).map((application) => (
            <li key={application.id} className="rounded-2xl border border-border p-5 shadow-sm">
              <p className="text-sm font-medium text-foreground">{application.requested_role}</p>
              <p className="mt-1 text-sm text-muted">{application.justification}</p>
              <ApplicationDecisionForm applicationId={application.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

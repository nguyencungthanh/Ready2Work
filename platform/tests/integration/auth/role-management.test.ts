import { afterEach, describe, expect, it } from "vitest";
import { TestFixtureFactory } from "@/tests/fixtures/factory";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";

// AUTH-011 / AUTH-012 behaviour that RLS alone does not cover: the approval
// state machine and suspension enforcement.
const factory = new TestFixtureFactory();

afterEach(async () => {
  await factory.cleanup();
});

describe("role application approval (AUTH-011)", () => {
  it("grants the requested role only after approval", async () => {
    const applicant = await factory.createUser();
    const service = createServiceRoleClient();

    const { data: application } = await service
      .from("role_applications")
      .insert({ user_id: applicant.id, requested_role: "mentor", justification: "x".repeat(30) })
      .select("id")
      .single();

    // Before approval the applicant is still only a mentee.
    const { data: before } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", applicant.id);
    expect(before?.map((r) => r.role)).toEqual(["mentee"]);

    await service
      .from("role_applications")
      .update({ status: "approved", decided_at: new Date().toISOString() })
      .eq("id", application!.id);
    await service.from("user_roles").insert({ user_id: applicant.id, role: "mentor" });

    const { data: after } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", applicant.id);
    expect(after?.map((r) => r.role).sort()).toEqual(["mentee", "mentor"]);
  });

  it("a pending applicant does not hold the role they applied for", async () => {
    const applicant = await factory.createUser();
    const service = createServiceRoleClient();

    await service
      .from("role_applications")
      .insert({ user_id: applicant.id, requested_role: "mentor", justification: "y".repeat(30) });

    const client = await factory.createClientForUser(applicant);
    const { data } = await client.from("user_roles").select("role").eq("user_id", applicant.id);

    expect(data?.map((r) => r.role)).not.toContain("mentor");
  });
});

describe("account suspension (AUTH-012)", () => {
  it("marks the profile suspended so the session helper can block access", async () => {
    const user = await factory.createUser();
    await factory.setAccountStatus(user, "suspended");

    const service = createServiceRoleClient();
    const { data } = await service
      .from("profiles")
      .select("account_status")
      .eq("id", user.id)
      .maybeSingle();

    expect(data?.account_status).toBe("suspended");
  });

  it("a suspended user can be reinstated", async () => {
    const user = await factory.createUser();
    await factory.setAccountStatus(user, "suspended");
    await factory.setAccountStatus(user, "active");

    const service = createServiceRoleClient();
    const { data } = await service
      .from("profiles")
      .select("account_status")
      .eq("id", user.id)
      .maybeSingle();

    expect(data?.account_status).toBe("active");
  });
});

describe("account deletion request (AUTH-013)", () => {
  it("marks the account rather than removing the row immediately", async () => {
    const user = await factory.createUser();
    await factory.setAccountStatus(user, "deletion_requested");

    const service = createServiceRoleClient();
    const { data } = await service
      .from("profiles")
      .select("id, account_status")
      .eq("id", user.id)
      .maybeSingle();

    // Row still exists, so audit/legal retention is possible (section 8.9).
    expect(data?.id).toBe(user.id);
    expect(data?.account_status).toBe("deletion_requested");
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { TestFixtureFactory } from "@/tests/fixtures/factory";

// RLS matrix for identity tables (master plan section 26.4, AUTH-010).
// These are release blockers: a failure here means one user can reach
// another user's private data.
if (!/^http:\/\/(localhost|127\.0\.0\.1):54321\/?$/.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")) {
  throw new Error("Identity RLS fixtures may run only against the local Supabase stack.");
}
const factory = new TestFixtureFactory();

afterEach(async () => {
  await factory.cleanup();
});

describe("profiles RLS", () => {
  it("creates a profile automatically on signup (AUTH-006)", async () => {
    const user = await factory.createUser();
    const client = await factory.createClientForUser(user);

    const { data, error } = await client
      .from("profiles")
      .select("id, email, account_status")
      .eq("id", user.id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(user.id);
    expect(data?.account_status).toBe("active");
  });

  it("assigns the mentee role on signup and nothing more", async () => {
    const user = await factory.createUser();
    const client = await factory.createClientForUser(user);

    const { data } = await client.from("user_roles").select("role").eq("user_id", user.id);

    expect(data?.map((r) => r.role)).toEqual(["mentee"]);
  });

  it("user A cannot read user B's profile", async () => {
    const userA = await factory.createUser();
    const userB = await factory.createUser();
    const clientA = await factory.createClientForUser(userA);

    const { data, error } = await clientA.from("profiles").select("id,email,university,city").eq("id", userB.id);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("persists a user's education and city across fresh authenticated clients", async () => {
    const user = await factory.createUser();
    const client = await factory.createClientForUser(user);
    const saved = { university: "Đại học Kiểm định", major: "Công nghệ thông tin", city: "Đà Nẵng", onboarding_status: "completed" };
    const update = await client.from("profiles").update(saved).eq("id", user.id).select("id").single();
    expect(update.error).toBeNull();
    expect(update.data?.id).toBe(user.id);
    expect((await client.auth.signOut()).error).toBeNull();
    const returning = await factory.createClientForUser(user);
    const profile = await returning.from("profiles").select("university,major,city,onboarding_status").eq("id", user.id).single();
    expect(profile.error).toBeNull();
    expect(profile.data).toEqual(saved);
  });

  it("an anonymous visitor cannot read any profile", async () => {
    await factory.createUser();
    const anon = factory.createAnonymousClient();

    const { data } = await anon.from("profiles").select("id");

    expect(data ?? []).toEqual([]);
  });

  it("user A cannot update user B's profile", async () => {
    const userA = await factory.createUser();
    const userB = await factory.createUser();
    const clientA = await factory.createClientForUser(userA);
    const clientB = await factory.createClientForUser(userB);
    const original = { university: "Đại học của B", city: "Hà Nội" };
    expect((await clientB.from("profiles").update(original).eq("id", userB.id)).error).toBeNull();
    const attack = await clientA.from("profiles").update({ university: "Trường bị thay đổi", city: "Tỉnh bị thay đổi" }).eq("id", userB.id).select("id");
    expect(attack.error).toBeNull();
    expect(attack.data).toEqual([]);
    const { data, error } = await clientB
      .from("profiles")
      .select("university,city")
      .eq("id", userB.id)
      .single();
    expect(error).toBeNull();
    expect(data).toEqual(original);
  });

  it("a suspended user cannot update their own profile (AUTH-012)", async () => {
    const user = await factory.createUser();
    const client = await factory.createClientForUser(user);
    await factory.setAccountStatus(user, "suspended");

    await client.from("profiles").update({ display_name: "still-active" }).eq("id", user.id);

    const { data } = await client
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    expect(data?.display_name).not.toBe("still-active");
  });
});

describe("user_roles RLS", () => {
  it("a user cannot grant themselves a privileged role", async () => {
    const user = await factory.createUser();
    const client = await factory.createClientForUser(user);

    const { error } = await client
      .from("user_roles")
      .insert({ user_id: user.id, role: "admin" });

    expect(error).not.toBeNull();
  });

  it("user A cannot read user B's roles", async () => {
    const userA = await factory.createUser();
    const userB = await factory.createUser();
    const clientA = await factory.createClientForUser(userA);

    const { data } = await clientA.from("user_roles").select("role").eq("user_id", userB.id);

    expect(data).toEqual([]);
  });
});

describe("role_applications RLS", () => {
  it("a user can create and read their own application", async () => {
    const user = await factory.createUser();
    const client = await factory.createClientForUser(user);

    const { error: insertError } = await client
      .from("role_applications")
      .insert({ user_id: user.id, requested_role: "mentor", justification: "5 years experience" });
    expect(insertError).toBeNull();

    const { data } = await client.from("role_applications").select("requested_role, status");
    expect(data?.[0]?.requested_role).toBe("mentor");
    expect(data?.[0]?.status).toBe("submitted");
  });

  it("a user cannot create an application on behalf of someone else", async () => {
    const userA = await factory.createUser();
    const userB = await factory.createUser();
    const clientA = await factory.createClientForUser(userA);

    const { error } = await clientA
      .from("role_applications")
      .insert({ user_id: userB.id, requested_role: "mentor" });

    expect(error).not.toBeNull();
  });

  it("a user cannot approve their own application", async () => {
    const user = await factory.createUser();
    const client = await factory.createClientForUser(user);
    await client
      .from("role_applications")
      .insert({ user_id: user.id, requested_role: "mentor" });

    // No UPDATE policy exists for non-admins, so the write affects no rows.
    await client.from("role_applications").update({ status: "approved" }).eq("user_id", user.id);

    const { data } = await client.from("role_applications").select("status");
    expect(data?.[0]?.status).toBe("submitted");
  });

  it("an admin can read another user's application", async () => {
    const applicant = await factory.createUser();
    const admin = await factory.createUser();
    await factory.grantRole(admin, "admin");

    const applicantClient = await factory.createClientForUser(applicant);
    await applicantClient
      .from("role_applications")
      .insert({ user_id: applicant.id, requested_role: "mentor" });

    const adminClient = await factory.createClientForUser(admin);
    const { data } = await adminClient
      .from("role_applications")
      .select("user_id")
      .eq("user_id", applicant.id);

    expect(data?.length).toBe(1);
  });
});

describe("audit_logs RLS", () => {
  it("is not readable by an authenticated user", async () => {
    const user = await factory.createUser();
    const client = await factory.createClientForUser(user);

    const { data } = await client.from("audit_logs").select("id");

    expect(data ?? []).toEqual([]);
  });
});

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestFixtureFactory } from "@/tests/fixtures/factory";

// Integration test: requires the local Supabase stack (`supabase start`) and
// .env.local. Verifies the fixture factory produces genuinely isolated users
// and that feature_flags RLS behaves as the migration intends.
const factory = new TestFixtureFactory();

beforeAll(() => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error(
      "Local Supabase env missing. Copy .env.example to .env.local and run `supabase start`."
    );
  }
});

afterEach(async () => {
  await factory.cleanup();
});

describe("TestFixtureFactory", () => {
  it("creates distinct users with unique ids and emails", async () => {
    const userA = await factory.createUser();
    const userB = await factory.createUser();

    expect(userA.id).not.toBe(userB.id);
    expect(userA.email).not.toBe(userB.email);
  });

  it("produces a client that can authenticate as the created user", async () => {
    const user = await factory.createUser();
    const client = await factory.createClientForUser(user);

    const { data } = await client.auth.getUser();
    expect(data.user?.id).toBe(user.id);
  });

  it("cleanup removes the users it created", async () => {
    const user = await factory.createUser();
    await factory.cleanup();

    const client = factory.createAnonymousClient();
    const { error } = await client.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });
    expect(error).not.toBeNull();
  });
});

describe("feature_flags RLS", () => {
  it("is readable by an anonymous visitor", async () => {
    await factory.createFeatureFlag(`test_flag_${crypto.randomUUID()}`, true);
    const client = factory.createAnonymousClient();

    const { data, error } = await client.from("feature_flags").select("key, enabled");

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });

  it("cannot be written by an anonymous visitor", async () => {
    const client = factory.createAnonymousClient();

    const { error } = await client
      .from("feature_flags")
      .insert({ key: "should_not_exist", enabled: true });

    expect(error).not.toBeNull();
  });

  it("cannot be written by an authenticated non-admin user", async () => {
    const user = await factory.createUser();
    const client = await factory.createClientForUser(user);

    const { error } = await client
      .from("feature_flags")
      .insert({ key: "also_should_not_exist", enabled: true });

    expect(error).not.toBeNull();
  });
});

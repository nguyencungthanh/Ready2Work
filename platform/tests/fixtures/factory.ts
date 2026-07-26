import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

/**
 * Creates isolated users and data for integration/RLS tests, tracking every
 * created row so a single cleanup() call removes them. Each factory instance
 * is independent, so parallel test files never collide (FND-007).
 *
 * Test-only: this uses the service-role key and bypasses RLS. Never import
 * from application code.
 */
export class TestFixtureFactory {
  private readonly admin: SupabaseClient;
  private readonly createdUserIds: string[] = [];
  private readonly createdFlagKeys: string[] = [];

  constructor(admin: SupabaseClient = createServiceRoleClient()) {
    this.admin = admin;
  }

  /** Creates a confirmed auth user with a unique email. */
  async createUser(overrides: { email?: string; password?: string } = {}): Promise<TestUser> {
    const unique = crypto.randomUUID();
    const email = overrides.email ?? `test-${unique}@example.test`;
    const password = overrides.password ?? `pw-${unique}`;

    const { data, error } = await this.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error || !data.user) {
      throw new Error(`Failed to create test user: ${error?.message ?? "no user returned"}`);
    }

    this.createdUserIds.push(data.user.id);
    return { id: data.user.id, email, password };
  }

  /**
   * Returns a Supabase client authenticated as the given user, so tests can
   * assert what that user can and cannot read under RLS.
   */
  async createClientForUser(user: TestUser): Promise<SupabaseClient> {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !publishableKey) {
      throw new Error("Supabase public env vars are required to build a user client");
    }

    const client = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await client.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });
    if (error) {
      throw new Error(`Failed to sign in test user: ${error.message}`);
    }

    return client;
  }

  /** Anonymous client, for asserting what an unauthenticated visitor can reach. */
  createAnonymousClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !publishableKey) {
      throw new Error("Supabase public env vars are required to build an anonymous client");
    }
    return createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async createFeatureFlag(key: string, enabled: boolean): Promise<void> {
    const { error } = await this.admin
      .from("feature_flags")
      .insert({ key, enabled, description: "test fixture" });

    if (error) {
      throw new Error(`Failed to create test feature flag: ${error.message}`);
    }
    this.createdFlagKeys.push(key);
  }

  /** Removes everything this factory created. Safe to call more than once. */
  async cleanup(): Promise<void> {
    if (this.createdFlagKeys.length > 0) {
      await this.admin.from("feature_flags").delete().in("key", this.createdFlagKeys);
      this.createdFlagKeys.length = 0;
    }

    for (const userId of this.createdUserIds) {
      await this.admin.auth.admin.deleteUser(userId);
    }
    this.createdUserIds.length = 0;
  }
}

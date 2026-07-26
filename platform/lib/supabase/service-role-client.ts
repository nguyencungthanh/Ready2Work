import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const secretEnvSchema = z.object({
  url: z.string().min(1, "NEXT_PUBLIC_SUPABASE_URL is required"),
  secretKey: z.string().min(1, "SUPABASE_SECRET_KEY is required"),
});

/**
 * Service-role Supabase client. Bypasses RLS entirely, so it must only ever
 * be constructed in server-only code paths (admin operations, scheduled
 * jobs, test fixtures) and never reached from anything the browser bundles.
 * See master plan rule 4 and section 9.4.
 */
export function createServiceRoleClient(): SupabaseClient {
  const parsed = secretEnvSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    secretKey: process.env.SUPABASE_SECRET_KEY,
  });

  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.message).join(" ");
    throw new Error(`Invalid service-role Supabase configuration: ${missing}`);
  }

  return createClient(parsed.data.url, parsed.data.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "./env";

/**
 * Anon-key Supabase client for server-side reads that rely on RLS policies
 * open to `anon`/`authenticated` (e.g. feature flags, public content).
 * Do not use this for privileged operations - those need the service-role
 * client (added alongside the operations that require it), and never with
 * a client importable from browser code. See master plan rules 4 and 9.4.
 */
export function createServerSupabaseClient() {
  const env = getSupabasePublicEnv();
  return createClient(env.url, env.publishableKey, {
    auth: { persistSession: false },
  });
}

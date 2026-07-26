import "server-only";
import { z } from "zod";

const supabasePublicEnvSchema = z.object({
  url: z.string().min(1, "NEXT_PUBLIC_SUPABASE_URL is required"),
  publishableKey: z.string().min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required"),
});

export type SupabasePublicEnv = z.infer<typeof supabasePublicEnvSchema>;

/**
 * Reads the public (anon-key) Supabase config. These values are safe to
 * expose to the browser (NEXT_PUBLIC_ prefix), but this module still lives
 * server-side so all Supabase access goes through domain services rather
 * than being wired ad hoc into client components.
 */
export function getSupabasePublicEnv(): SupabasePublicEnv {
  const parsed = supabasePublicEnvSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.message).join(" ");
    throw new Error(`Invalid Supabase environment configuration: ${missing}`);
  }

  return parsed.data;
}

import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "./env";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Sessions use Supabase SSR cookies shared with the existing browser client
 * (onboarding and business forms). Keep both clients on the same cookie model.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabasePublicEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies; the middleware refreshes
          // the session instead, so this is safe to ignore.
        }
      },
    },
  });
}

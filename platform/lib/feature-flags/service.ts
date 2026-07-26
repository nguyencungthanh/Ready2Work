import "server-only";
import { z } from "zod";
import { logger } from "@/lib/observability/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";

const featureFlagRowSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
});

/**
 * Reads a feature flag by key (master plan section 10.2 "System" table
 * group, FND-006). Fails closed: any lookup error or missing flag returns
 * false rather than throwing, so a flag-service hiccup can never accidentally
 * turn on an expensive or unreviewed capability (see section 19.6 "feature
 * flag expensive capabilities").
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("feature_flags")
    .select("key, enabled")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    logger.error("feature_flag_lookup_failed", {
      operation: "isFeatureEnabled",
      domain: "feature-flags",
      error_code: error.code ?? "UNKNOWN",
    });
    return false;
  }

  if (!data) {
    return false;
  }

  const parsed = featureFlagRowSchema.safeParse(data);
  if (!parsed.success) {
    logger.error("feature_flag_invalid_row", {
      operation: "isFeatureEnabled",
      domain: "feature-flags",
    });
    return false;
  }

  return parsed.data.enabled;
}

/**
 * Reads every flag as a key -> enabled map, for callers that need to check
 * several flags at once without one round trip per key.
 */
export async function getAllFeatureFlags(): Promise<Record<string, boolean>> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.from("feature_flags").select("key, enabled");

  if (error) {
    logger.error("feature_flag_list_failed", {
      operation: "getAllFeatureFlags",
      domain: "feature-flags",
      error_code: error.code ?? "UNKNOWN",
    });
    return {};
  }

  const result: Record<string, boolean> = {};
  for (const row of data ?? []) {
    const parsed = featureFlagRowSchema.safeParse(row);
    if (parsed.success) {
      result[parsed.data.key] = parsed.data.enabled;
    }
  }
  return result;
}

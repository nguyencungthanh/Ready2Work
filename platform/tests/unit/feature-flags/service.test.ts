import { beforeEach, describe, expect, it, vi } from "vitest";

const maybeSingle = vi.fn();
const select = vi.fn();
const eq = vi.fn();
const from = vi.fn();

vi.mock("@/lib/supabase/server-client", () => ({
  createServerSupabaseClient: () => ({ from }),
}));

vi.mock("@/lib/observability/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { getAllFeatureFlags, isFeatureEnabled } from "@/lib/feature-flags/service";

beforeEach(() => {
  maybeSingle.mockReset();
  select.mockReset();
  eq.mockReset();
  from.mockReset();

  from.mockReturnValue({ select });
  select.mockReturnValue({ eq, then: undefined });
  eq.mockReturnValue({ maybeSingle });
});

describe("isFeatureEnabled", () => {
  it("returns true when the flag row exists and is enabled", async () => {
    maybeSingle.mockResolvedValue({ data: { key: "ai_chatbot", enabled: true }, error: null });

    await expect(isFeatureEnabled("ai_chatbot")).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith("feature_flags");
    expect(eq).toHaveBeenCalledWith("key", "ai_chatbot");
  });

  it("returns false when the flag row exists and is disabled", async () => {
    maybeSingle.mockResolvedValue({ data: { key: "ai_chatbot", enabled: false }, error: null });

    await expect(isFeatureEnabled("ai_chatbot")).resolves.toBe(false);
  });

  it("fails closed (returns false) when the flag does not exist", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(isFeatureEnabled("unknown_flag")).resolves.toBe(false);
  });

  it("fails closed (returns false) when the query errors", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { code: "500" } });

    await expect(isFeatureEnabled("ai_chatbot")).resolves.toBe(false);
  });

  it("fails closed (returns false) when the row shape is invalid", async () => {
    maybeSingle.mockResolvedValue({ data: { key: "ai_chatbot", enabled: "yes" }, error: null });

    await expect(isFeatureEnabled("ai_chatbot")).resolves.toBe(false);
  });
});

describe("getAllFeatureFlags", () => {
  it("returns a key -> enabled map for valid rows", async () => {
    select.mockReturnValue(
      Promise.resolve({
        data: [
          { key: "ai_chatbot", enabled: true },
          { key: "mentor_matching", enabled: false },
        ],
        error: null,
      })
    );

    await expect(getAllFeatureFlags()).resolves.toEqual({
      ai_chatbot: true,
      mentor_matching: false,
    });
  });

  it("returns an empty object on query error", async () => {
    select.mockReturnValue(Promise.resolve({ data: null, error: { code: "500" } }));

    await expect(getAllFeatureFlags()).resolves.toEqual({});
  });

  it("skips rows that do not match the expected shape", async () => {
    select.mockReturnValue(
      Promise.resolve({
        data: [{ key: "ai_chatbot", enabled: true }, { key: "bad_row" }],
        error: null,
      })
    );

    await expect(getAllFeatureFlags()).resolves.toEqual({ ai_chatbot: true });
  });
});

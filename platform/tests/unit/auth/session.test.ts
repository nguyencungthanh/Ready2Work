import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ client: vi.fn(), claims: vi.fn(), profile: vi.fn(), roles: vi.fn() }));
vi.mock("react", () => ({ cache: <T>(fn: T) => fn }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: mocks.client }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
import { getSessionUser, requireUser } from "@/lib/auth/session";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "unit-test-placeholder");
  mocks.client.mockResolvedValue({
    auth: { getClaims: mocks.claims },
    from: (table: string) => ({ select: () => ({ eq: () => table === "profiles" ? { maybeSingle: mocks.profile } : mocks.roles() }) }),
  });
  mocks.claims.mockResolvedValue({ data: { claims: { sub: "verified-owner", email: "user@example.com" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { display_name: "Người dùng", account_status: "active" }, error: null });
  mocks.roles.mockResolvedValue({ data: [{ role: "mentee" }], error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("usable session resolution", () => {
  it("keeps the verified identity and stored profile/roles", async () => {
    expect(await getSessionUser()).toEqual({ id: "verified-owner", email: "user@example.com", displayName: "Người dùng", accountStatus: "active", roles: ["mentee"] });
  });

  it("does not invent an active profile when no profile exists", async () => {
    mocks.profile.mockResolvedValue({ data: null, error: null });
    expect(await getSessionUser()).toBeNull();
    await expect(requireUser()).rejects.toThrow("REDIRECT:/signin");
  });

  it.each(["profile", "roles"])("does not return an active partial session when %s lookup fails", async (lookup) => {
    mocks[lookup as "profile" | "roles"].mockResolvedValue({ data: null, error: { message: "private-database-detail" } });
    await expect(getSessionUser()).rejects.toThrow("Không tải được hồ sơ tài khoản");
    await expect(getSessionUser()).rejects.not.toThrow("private-database-detail");
  });

  it.each([["deleted", "/signin"], ["suspended", "/suspended"]])("blocks a %s account even with valid signed claims", async (accountStatus, destination) => {
    mocks.profile.mockResolvedValue({ data: { display_name: "Người dùng", account_status: accountStatus }, error: null });
    await expect(requireUser()).rejects.toThrow(`REDIRECT:${destination}`);
  });
});

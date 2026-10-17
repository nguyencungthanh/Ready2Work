import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";

const mocks = vi.hoisted(() => ({ create: vi.fn(), claims: vi.fn(), profile: vi.fn(), signOut: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.create }));
import { proxy } from "@/proxy";

type CookieWriter = (cookies: { name: string; value: string; options: CookieOptions }[], headers: Record<string, string>) => void;
let setCookies: CookieWriter;
const noCache = { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0", Expires: "0", Pragma: "no-cache" };
const origin = "https://ready-2work.vercel.app";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "unit-test-placeholder");
  mocks.create.mockImplementation((_url, _key, options) => {
    setCookies = options.cookies.setAll;
    return {
      auth: { getClaims: mocks.claims, signOut: mocks.signOut },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
    };
  });
  mocks.claims.mockResolvedValue({ data: { claims: { sub: "verified-owner" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { account_status: "active" }, error: null });
  mocks.signOut.mockImplementation(async () => {
    setCookies([{ name: "sb-session", value: "", options: { path: "/", maxAge: 0 } }], noCache);
    return { error: null };
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("auth proxy session transitions", () => {
  it("preserves cleared cookies and the full return query when redirecting an expired session", async () => {
    mocks.claims.mockImplementation(async () => {
      setCookies([{ name: "sb-session", value: "", options: { path: "/", maxAge: 0 } }], noCache);
      return { data: null, error: { code: "session_expired" } };
    });
    const response = await proxy(new NextRequest(`${origin}/simulations?industry=Marketing`));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/signin");
    expect(location.searchParams.get("next")).toBe("/simulations?industry=Marketing");
    expect(response.cookies.get("sb-session")).toMatchObject({ value: "", maxAge: 0, path: "/" });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
  });

  it("keeps all refreshed cookie batches and cache headers on a signed-in redirect", async () => {
    mocks.claims.mockImplementation(async () => {
      setCookies([{ name: "old-chunk", value: "", options: { path: "/", maxAge: 0 } }], noCache);
      setCookies([{ name: "sb-session", value: "refreshed", options: { path: "/", secure: true, sameSite: "lax" } }], {});
      return { data: { claims: { sub: "verified-owner" } }, error: null };
    });
    const response = await proxy(new NextRequest(`${origin}/signin`));
    expect(response.headers.get("location")).toBe(`${origin}/dashboard`);
    expect(response.cookies.get("old-chunk")).toMatchObject({ value: "", maxAge: 0 });
    expect(response.cookies.get("sb-session")).toMatchObject({ value: "refreshed", secure: true, sameSite: "lax" });
    expect(response.headers.get("Cache-Control")).toContain("private");
    expect(response.headers.get("Expires")).toBe("0");
  });

  it("does not redirect a deleted account back to the dashboard", async () => {
    mocks.profile.mockResolvedValue({ data: { account_status: "deleted" }, error: null });
    const response = await proxy(new NextRequest(`${origin}/signin`));
    expect(mocks.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
    expect(response.headers.get("location")).toBeNull();
    expect(response.cookies.get("sb-session")).toMatchObject({ value: "", maxAge: 0 });
  });

  it("preserves sign-out cookies while sending a suspended account to its status page", async () => {
    mocks.profile.mockResolvedValue({ data: { account_status: "suspended" }, error: null });
    const response = await proxy(new NextRequest(`${origin}/reset-password`));
    expect(response.headers.get("location")).toBe(`${origin}/suspended`);
    expect(response.cookies.get("sb-session")?.maxAge).toBe(0);
  });

  it.each([
    { data: null, error: null },
    { data: null, error: { code: "unavailable" } },
  ])("keeps the sign-in page accessible when no usable profile can be resolved: %j", async (profile) => {
    mocks.profile.mockResolvedValue(profile);
    const response = await proxy(new NextRequest(`${origin}/signin`));
    expect(response.headers.get("location")).toBeNull();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("passes refreshed cookies through to the password form without redirecting an active recovery session", async () => {
    mocks.claims.mockImplementation(async () => {
      setCookies([{ name: "sb-session", value: "refreshed", options: { path: "/" } }], noCache);
      return { data: { claims: { sub: "verified-owner" } }, error: null };
    });
    const response = await proxy(new NextRequest(`${origin}/update-password`));
    expect(response.headers.get("location")).toBeNull();
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
    expect(mocks.profile).not.toHaveBeenCalled();
  });
});

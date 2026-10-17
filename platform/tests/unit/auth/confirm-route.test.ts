import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ client: vi.fn(), exchange: vi.fn(), verify: vi.fn(), warn: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: mocks.client }));
vi.mock("@/lib/observability/logger", () => ({ logger: { warn: mocks.warn } }));
import { GET } from "@/app/auth/confirm/route";

const origin = "https://ready-2work.vercel.app";
const request = (query: string) => new NextRequest(`${origin}/auth/confirm${query}`);
const verified = (intent = "candidate", redirectType?: string) => ({
  data: { user: { id: "verified-owner", user_metadata: { account_intent: intent } }, ...(redirectType ? { redirectType } : {}) }, error: null,
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.client.mockResolvedValue({ auth: { exchangeCodeForSession: mocks.exchange, verifyOtp: mocks.verify } });
});

describe("email confirmation and recovery callbacks", () => {
  it("accepts the PKCE code emitted by Supabase's default email template", async () => {
    mocks.exchange.mockResolvedValue(verified());
    const response = await GET(request("?code=one-time-code"));
    expect(mocks.exchange).toHaveBeenCalledExactlyOnceWith("one-time-code");
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(`${origin}/dashboard`);
  });

  it("retains the custom token_hash email template flow", async () => {
    mocks.verify.mockResolvedValue(verified());
    const response = await GET(request("?token_hash=one-time-hash&type=signup"));
    expect(mocks.verify).toHaveBeenCalledExactlyOnceWith({ token_hash: "one-time-hash", type: "signup" });
    expect(mocks.exchange).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(`${origin}/dashboard`);
  });

  it("sends PKCE recovery to the password form based on the verified flow type", async () => {
    mocks.exchange.mockResolvedValue(verified("candidate", "recovery"));
    expect((await GET(request("?code=recovery-code"))).headers.get("location")).toBe(`${origin}/update-password`);
  });

  it("sends token_hash recovery to the password form", async () => {
    mocks.verify.mockResolvedValue(verified());
    expect((await GET(request("?token_hash=recovery-hash&type=recovery"))).headers.get("location")).toBe(`${origin}/update-password`);
  });

  it("uses the verified account intent for business onboarding, ignoring browser-supplied intent and external redirects", async () => {
    mocks.exchange.mockResolvedValue(verified("business"));
    const response = await GET(request("?code=one-time-code&next=https%3A%2F%2Fexample.test%2Fsteal&account_intent=admin"));
    expect(response.headers.get("location")).toBe(`${origin}/business`);
  });

  it("rejects missing tokens and unsupported OTP types without contacting Auth", async () => {
    for (const query of ["", "?token_hash=hash", "?token_hash=hash&type=sms", "?token_hash=hash&type=not-a-flow"]) {
      expect((await GET(request(query))).headers.get("location")).toBe(`${origin}/signin?error=invalid_link`);
    }
    expect(mocks.client).not.toHaveBeenCalled();
    expect(mocks.exchange).not.toHaveBeenCalled();
    expect(mocks.verify).not.toHaveBeenCalled();
  });

  it("does not establish a successful destination for an expired or rejected provider token", async () => {
    mocks.exchange.mockResolvedValue({ data: { user: null }, error: { message: "private provider detail" } });
    const response = await GET(request("?code=expired-code"));
    expect(response.headers.get("location")).toBe(`${origin}/signin?error=expired_link`);
    expect(response.headers.get("location")).not.toContain("private");
  });

  it("returns a recoverable sign-in destination if exchanging the code loses its network connection", async () => {
    mocks.exchange.mockRejectedValue(new Error("private provider connection details"));
    const response = await GET(request("?code=one-time-code"));
    expect(response.headers.get("location")).toBe(`${origin}/signin?error=service_unavailable`);
    expect(response.headers.get("location")).not.toContain("private");
  });

  it("distinguishes temporary provider failure from an expired token", async () => {
    mocks.verify.mockResolvedValue({ data: { user: null }, error: { status: 503, message: "private provider details" } });
    const response = await GET(request("?token_hash=one-time-hash&type=signup"));
    expect(response.headers.get("location")).toBe(`${origin}/signin?error=service_unavailable`);
    expect(response.headers.get("location")).not.toContain("private");
  });

  it.each([
    { name: "AuthPKCECodeVerifierMissingError", code: "pkce_code_verifier_not_found", status: 400 },
    { name: "AuthApiError", code: "bad_code_verifier", status: 400 },
  ])("explains missing or mismatched browser context instead of claiming expiry", async (error) => {
    mocks.exchange.mockResolvedValue({ data: { user: null }, error });
    const response = await GET(request("?code=private-one-time-code"));
    expect(response.headers.get("location")).toBe(`${origin}/signin?error=browser_context_missing`);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.warn).toHaveBeenCalledWith("Email confirmation failed", expect.objectContaining({ error_code: "browser_context_missing", operation: "pkce_exchange" }));
    expect(JSON.stringify(mocks.warn.mock.calls)).not.toContain("private-one-time-code");
  });
});

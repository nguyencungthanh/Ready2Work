import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  client: vi.fn(), signIn: vi.fn(), profile: vi.fn(), signOut: vi.fn(), update: vi.fn(),
  requireUser: vi.fn(), reset: vi.fn(), signUp: vi.fn(), revalidate: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: mocks.client }));
vi.mock("@/lib/auth/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { requestPasswordResetAction, signInAction, signUpAction, updatePasswordAction } from "@/app/(auth)/actions";

const password = "Ready2Work-Test-1";
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.client.mockResolvedValue({
    auth: { signInWithPassword: mocks.signIn, signOut: mocks.signOut, updateUser: mocks.update, resetPasswordForEmail: mocks.reset, signUp: mocks.signUp },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
  });
  mocks.signIn.mockResolvedValue({ data: { user: { id: "verified-owner", user_metadata: {} } }, error: null });
  mocks.profile.mockResolvedValue({ data: { account_status: "active" }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.requireUser.mockResolvedValue({ id: "verified-owner", accountStatus: "active" });
  mocks.update.mockResolvedValue({ error: null });
});

describe("auth account checks and password mutations", () => {
  it.each([
    { data: null, error: null },
    { data: null, error: { code: "database_unavailable" } },
  ])("does not establish a successful sign-in when profile lookup fails: %j", async (profile) => {
    mocks.profile.mockResolvedValue(profile);
    const state = await signInAction({}, form({ email: "user@example.com", password }));
    expect(state.error).toContain("hồ sơ tài khoản");
    expect(mocks.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("clears the newly created session for a deleted account", async () => {
    mocks.profile.mockResolvedValue({ data: { account_status: "deleted" }, error: null });
    expect(await signInAction({}, form({ email: "user@example.com", password }))).toEqual({ error: "Tài khoản này hiện chưa thể đăng nhập." });
    expect(mocks.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
  });

  it("accepts a safe return path while normalizing pasted email whitespace without altering the password", async () => {
    await expect(signInAction({}, form({ email: "  user@example.com  ", password: ` ${password} `, next: "/simulations?industry=Marketing" }))).rejects.toThrow("REDIRECT:/simulations?industry=Marketing");
    expect(mocks.signIn).toHaveBeenCalledExactlyOnceWith({ email: "user@example.com", password: ` ${password} ` });
  });

  it("uses the verified business intent when an external return URL is supplied", async () => {
    mocks.signIn.mockResolvedValue({ data: { user: { id: "verified-owner", user_metadata: { account_intent: "business" } } }, error: null });
    await expect(signInAction({}, form({ email: "user@example.com", password, next: "https://outside.invalid" }))).rejects.toThrow("REDIRECT:/business");
  });

  it("checks account status before changing a password", async () => {
    mocks.requireUser.mockRejectedValue(new Error("REDIRECT:/suspended"));
    await expect(updatePasswordAction({}, form({ password, confirmPassword: password }))).rejects.toThrow("REDIRECT:/suspended");
    expect(mocks.client).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does not claim success when the password provider is unavailable", async () => {
    mocks.update.mockRejectedValue(new Error("private-provider-detail"));
    const state = await updatePasswordAction({}, form({ password, confirmPassword: password }));
    expect(state.error).toContain("kết nối");
    expect(JSON.stringify(state)).not.toContain("private-provider-detail");
  });

  it("does not claim that reset email was sent when the provider returns a failure", async () => {
    mocks.reset.mockResolvedValue({ error: { status: 503 } });
    const state = await requestPasswordResetAction({}, form({ email: "user@example.com" }));
    expect(state.error).toContain("kết nối");
    expect(state.success).toBeUndefined();
  });

  it("rejects a whitespace-only name before signup reaches Auth", async () => {
    const state = await signUpAction({}, form({ email: "user@example.com", password, confirmPassword: password, displayName: "   ", acceptTerms: "on" }));
    expect(state.fieldErrors?.displayName).toBe("Nhập tên của bạn");
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
});

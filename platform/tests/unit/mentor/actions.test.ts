import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireRole: vi.fn(), from: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/supabase/service-role-client", () => ({ createServiceRoleClient: () => ({ from: mocks.from }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { recordMentorReviewAction } from "@/app/mentor/actions";
function query(data: unknown, error: unknown = null) {
  const result = { data, error };
  const chain = { select: vi.fn(() => chain), eq: vi.fn(() => chain),
    insert: vi.fn((value: unknown) => { void value; return chain; }), maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve) };
  return chain;
}
function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries({ email: "candidate@example.test", positionId: "IT-03", score: "85", feedback: "Directly reviewed the candidate's analysis and its supporting evidence.", consent: "on" })) data.set(key, value);
  return data;
}
beforeEach(() => { vi.clearAllMocks(); mocks.requireRole.mockResolvedValue({ id: "mentor" }); });
describe("trusted mentor review source", () => {
  it("requires an approved mentor or administrator before any privileged query", async () => {
    mocks.requireRole.mockRejectedValue(new Error("Forbidden"));
    await expect(recordMentorReviewAction({}, form())).rejects.toThrow("Forbidden");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects unconsented or out-of-range scores", async () => {
    const data = form(); data.set("score", "101");
    expect((await recordMentorReviewAction({}, data)).error).toBeTruthy();
    data.set("score", "85"); data.delete("consent");
    expect((await recordMentorReviewAction({}, data)).error).toBeTruthy();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("cannot record a self-review", async () => {
    mocks.from.mockReturnValue(query({ id: "mentor" }));
    expect((await recordMentorReviewAction({}, form())).error).toContain("ứng viên hợp lệ");
  });
  it("uses the verified actor and resolved candidate rather than supplied identities", async () => {
    const saved = query(null);
    mocks.from.mockImplementation((table: string) => table === "profiles" ? query({ id: "candidate" }) : saved);
    const data = form(); data.set("mentor_id", "forged"); data.set("candidate_id", "forged");
    expect((await recordMentorReviewAction({}, data)).success).toBeTruthy();
    expect(saved.insert).toHaveBeenCalledWith(expect.objectContaining({ mentor_id: "mentor", candidate_id: "candidate", position_id: "IT-03", score: 85 }));
  });
});

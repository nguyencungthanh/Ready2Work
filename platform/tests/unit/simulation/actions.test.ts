import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), privateFrom: vi.fn(), evaluate: vi.fn(), finalize: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn(async () => ({ id: "owner" })) }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn(async () => ({ from: mocks.from })) }));
vi.mock("@/lib/supabase/service-role-client", () => ({ createServiceRoleClient: vi.fn(() => ({ from: mocks.privateFrom, rpc: mocks.finalize })) }));
vi.mock("@/lib/simulation/ai-evaluator", () => ({ evaluateSubmissionWithAI: mocks.evaluate }));
vi.mock("@/lib/simulation/read-submission", () => ({ readSubmissionDocument: vi.fn() }));
vi.mock("@/lib/observability/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn((path) => { throw new Error(`REDIRECT:${path}`); }) }));
import { submitSimulationAction } from "@/app/simulations/actions";

const reference = { source_version: "20261017", source_policy: "document_only", content_revision: "20261017-doc-only" };
function query(data: unknown) {
  const chain = { select: vi.fn(() => chain), eq: vi.fn(() => chain), maybeSingle: vi.fn(async () => ({ data, error: null })) };
  return chain;
}
function form() { const data = new FormData(); data.set("attemptId", "attempt"); data.set("content", "Nội dung bài làm giả để kiểm tra luồng xử lý."); return data; }
function arrange(options: { slug?: string; available?: boolean; reference?: unknown; superseded?: boolean; missingAttempt?: boolean } = {}) {
  const attempt = query(options.missingAttempt ? null : { id: "attempt", user_id: "owner", simulation_id: "simulation", started_at: new Date(Date.now() - 5000).toISOString(), submission_id: null, superseded_at: options.superseded ? new Date().toISOString() : null });
  mocks.from.mockImplementation((table: string) => table === "simulation_attempts" ? attempt : query({ id: "simulation", slug: options.slug ?? "r2w-it-01", is_available: options.available ?? true }));
  mocks.privateFrom.mockReturnValue(query({ brief: "Đề bài nguồn", task_instructions: "Yêu cầu nguyên bản", grading_rubric: [{ id: "criterion" }], reference_data: "reference" in options ? options.reference : reference, min_words: 0 }));
  mocks.evaluate.mockResolvedValue({ overallScore: 0, overallBand: "Emerging", summary: "Chưa đáp ứng yêu cầu.", criteria: [], privateDetails: { checklistScores: [{ evidence: "Dữ liệu nội bộ" }] } });
  mocks.finalize.mockResolvedValue({ data: "submission", error: null });
  return attempt;
}
beforeEach(() => vi.resetAllMocks());

describe("source-only simulation submission boundary", () => {
  it.each([
    { slug: "campaign-launch-plan" },
    { available: false },
  ])("blocks legacy or unavailable work before reading its private rubric: %j", async (options) => {
    arrange(options);
    expect((await submitSimulationAction("simulation", {}, form())).error).toContain("chưa sẵn sàng");
    expect(mocks.privateFrom).not.toHaveBeenCalled();
    expect(mocks.evaluate).not.toHaveBeenCalled();
    expect(mocks.finalize).not.toHaveBeenCalled();
  });

  it.each([null, { source_version: "20261017" }, { ...reference, content_revision: "generated-marketing" }])("blocks stale r2w reference data before AI or saving: %j", async (oldReference) => {
    arrange({ reference: oldReference });
    expect((await submitSimulationAction("simulation", {}, form())).error).toContain("đồng bộ barem nguồn");
    expect(mocks.evaluate).not.toHaveBeenCalled();
    expect(mocks.finalize).not.toHaveBeenCalled();
  });

  it("grades the current revision and atomically separates private evidence from candidate feedback", async () => {
    const attempt = arrange();
    await expect(submitSimulationAction("simulation", {}, form())).rejects.toThrow("REDIRECT:/simulations/submissions/submission");
    expect(attempt.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(mocks.evaluate).toHaveBeenCalledWith(expect.any(String), "Đề bài nguồn", "Yêu cầu nguyên bản", [{ id: "criterion" }], 0, { referenceData: reference, actualDurationSeconds: expect.any(Number) });
    expect(mocks.finalize).toHaveBeenCalledExactlyOnceWith("finalize_simulation_attempt", expect.objectContaining({ p_attempt_id: "attempt", p_user_id: "owner", p_criterion_scores: { summary: "Chưa đáp ứng yêu cầu.", criteria: [] }, p_private_details: { checklistScores: [{ evidence: "Dữ liệu nội bộ" }] } }));
  });

  it("preserves genuinely published business work separately from the document-only r2w guard", async () => {
    arrange({ slug: "company-12345678-1234-1234-1234-123456789abc", reference: {} });
    await expect(submitSimulationAction("simulation", {}, form())).rejects.toThrow("REDIRECT:");
    expect(mocks.evaluate).toHaveBeenCalledOnce();
    expect(mocks.finalize).toHaveBeenCalledOnce();
  });

  it.each([{ missingAttempt: true }, { superseded: true }])("does not grade missing or superseded attempts: %j", async (options) => {
    arrange(options);
    expect((await submitSimulationAction("simulation", {}, form())).error).toBeTruthy();
    expect(mocks.privateFrom).not.toHaveBeenCalled();
    expect(mocks.evaluate).not.toHaveBeenCalled();
    expect(mocks.finalize).not.toHaveBeenCalled();
  });

  it("does not replace an AI failure with a fabricated grade", async () => {
    arrange();
    mocks.evaluate.mockRejectedValue(new Error("private provider details"));
    const result = await submitSimulationAction("simulation", {}, form());
    expect(result.error).toContain("AI chưa chấm được");
    expect(result.error).not.toContain("private provider");
    expect(mocks.finalize).not.toHaveBeenCalled();
  });
});

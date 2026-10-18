import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  userFrom: vi.fn(), serviceFrom: vi.fn(), evaluate: vi.fn(), revalidate: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn(async () => ({ id: "owner" })) }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn(async () => ({ from: mocks.userFrom })) }));
vi.mock("@/lib/supabase/service-role-client", () => ({ createServiceRoleClient: vi.fn(() => ({ from: mocks.serviceFrom })) }));
vi.mock("@/lib/interview/ai-evaluator", () => ({ evaluateInterviewWithAI: mocks.evaluate }));
vi.mock("@/lib/observability/logger", () => ({ logger: { error: vi.fn() } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: vi.fn((path) => { throw new Error(`REDIRECT:${path}`); }) }));
import { completeInterviewSessionAction, deleteInterviewSessionAction, submitInterviewAnswerAction } from "@/app/interviews/actions";

function query(data: unknown, error: unknown = null) {
  const result = { data, error };
  const chain = {
    select: vi.fn(() => chain), eq: vi.fn(() => chain), order: vi.fn(() => chain),
    is: vi.fn(() => chain), delete: vi.fn(() => chain), insert: vi.fn(() => chain), update: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return chain;
}
function form(answer = "Câu trả lời có bằng chứng của tôi.") { const data = new FormData(); data.set("sessionId", "session"); data.set("questionId", "question"); data.set("answerText", answer); return data; }
const currentSet = { slug: "r2w-qa-tester-20261017", is_available: true };
beforeEach(() => { vi.clearAllMocks(); });
describe("interview action authorization", () => {
  it("rejects an expired session before reading questions, grading or saving", async () => {
    mocks.userFrom.mockReturnValue(query({ id: "session", user_id: "owner", set_id: "set", created_at: new Date(Date.now()-3_600_000).toISOString(), completed_at: null, interview_sets: currentSet }));
    expect((await submitInterviewAnswerAction({}, form())).error).toContain("Đã hết 60 phút");
    expect(mocks.serviceFrom).not.toHaveBeenCalled();
    expect(mocks.evaluate).not.toHaveBeenCalled();
  });
  it("cannot grade an answer in another user's session", async () => {
    mocks.userFrom.mockReturnValue(query({ id: "session", user_id: "other", set_id: "set", created_at: new Date(Date.now()-5000).toISOString(), completed_at: null }));
    expect((await submitInterviewAnswerAction({}, form())).error).toContain("không khả dụng");
    expect(mocks.serviceFrom).not.toHaveBeenCalled();
    expect(mocks.evaluate).not.toHaveBeenCalled();
  });
  it("does not grade a source set that is pending clarification or archived", async () => {
    mocks.userFrom.mockReturnValue(query({ id: "session", user_id: "owner", set_id: "set", created_at: new Date(Date.now()-5000).toISOString(), completed_at: null, interview_sets: { is_available: false } }));
    expect((await submitInterviewAnswerAction({}, form())).error).toMatch(/chờ xác nhận|chưa mở chấm/);
    expect(mocks.serviceFrom).not.toHaveBeenCalled();
    expect(mocks.evaluate).not.toHaveBeenCalled();
  });
  it("cannot edit a completed interview", async () => {
    mocks.userFrom.mockReturnValue(query({ id: "session", user_id: "owner", set_id: "set", created_at: new Date(Date.now()-5000).toISOString(), completed_at: "2026-10-16" }));
    expect((await submitInterviewAnswerAction({}, form())).error).toContain("hoàn thành");
    expect(mocks.serviceFrom).not.toHaveBeenCalled();
  });
  it("does not accept a foreign or out-of-order question id supplied by the browser", async () => {
    mocks.userFrom.mockImplementation((table: string) => table === "interview_sessions"
      ? query({ id: "session", user_id: "owner", set_id: "set", created_at: new Date(Date.now()-5000).toISOString(), completed_at: null, interview_sets: currentSet }) : query([]));
    mocks.serviceFrom.mockReturnValue(query([{ id: "expected", prompt: "The real question", rubric: [], round_number: 1, position: 1 }]));
    expect((await submitInterviewAnswerAction({}, form())).error).toContain("chưa trả lời tiếp theo");
    expect(mocks.serviceFrom.mock.calls.map((call) => call[0])).toEqual(["interview_questions"]);
    expect(mocks.evaluate).not.toHaveBeenCalled();
  });
  it("cannot finish with an equal answer count from the wrong set", async () => {
    mocks.userFrom.mockImplementation((table: string) => {
      if (table === "interview_sessions") return query({ id: "session", user_id: "owner", set_id: "set", created_at: new Date(Date.now()-5000).toISOString(), completed_at: null });
      if (table === "interview_questions") return query([{ id: "a", round_number: 1 }, { id: "b", round_number: 2 }, { id: "c", round_number: 3 }]);
      return query([{ question_id: "a", score: 100 }, { question_id: "b", score: 100 }, { question_id: "foreign", score: 100 }]);
    });
    await expect(completeInterviewSessionAction(form())).rejects.toThrow("every question");
    expect(mocks.serviceFrom).not.toHaveBeenCalled();
  });
});

describe("owner-scoped interview deletion", () => {
  it("deletes only the requested owned session and refreshes progress", async () => {
    const deletion = query([{ id: "session" }]); mocks.userFrom.mockReturnValue(deletion);
    expect(await deleteInterviewSessionAction({}, form())).toEqual({});
    expect(deletion.delete).toHaveBeenCalledOnce();
    expect(deletion.eq).toHaveBeenCalledWith("id", "session");
    expect(deletion.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(mocks.revalidate).toHaveBeenCalledWith("/report");
    expect(mocks.serviceFrom).not.toHaveBeenCalled();
  });
  it("does not claim success or refresh after an inaccessible session or database error", async () => {
    for (const result of [query([]), query(null, { message: "private db detail" })]) {
      mocks.userFrom.mockReturnValue(result);
      const response = await deleteInterviewSessionAction({}, form());
      expect(response.error).toContain("Không xóa được");
      expect(response.error).not.toContain("private");
    }
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});

describe("interview answer submission regressions from feedback", () => {
  const shortAnswer = "Reactive/Proactive, Quality Assurance/Quality Control.";
  const criterion = { id: "definitions", label: "Phân biệt hai hoạt động", description: "Chấm đúng bằng chứng trong câu trả lời.", weight: 35, maxScore: 35 };
  function arrange(saveError: unknown = null, questionOverrides: Record<string, unknown> = {}, set = currentSet) {
    const saved = query(null, saveError);
    mocks.userFrom.mockImplementation((table: string) => table === "interview_sessions"
      ? query({ id: "session", user_id: "owner", set_id: "set", created_at: new Date(Date.now()-5000).toISOString(), completed_at: null, interview_sets: set }) : query([]));
    mocks.serviceFrom.mockImplementation((table: string) => table === "interview_questions"
      ? query([{ id: "question", prompt: "Bạn hãy phân biệt Testing và Quality Assurance", grading_rubric: [criterion], reference_answer: "Hướng dẫn riêng để chấm.", round_number: 1, position: 2, ...questionOverrides }]) : saved);
    return saved;
  }

  it("accepts a short nonempty answer and persists its low evaluation instead of treating a low score as failure", async () => {
    const saved = arrange();
    const criteria = [{ criterionId: "definitions", label: criterion.label, score: 8, maxScore: 35, note: "Cần giải thích bản chất hai hoạt động." }];
    mocks.evaluate.mockResolvedValue({ score: 23, criteria });

    expect(await submitInterviewAnswerAction({}, form(shortAnswer))).toEqual({});
    expect(mocks.evaluate).toHaveBeenCalledWith(shortAnswer, expect.any(String), "Hướng dẫn riêng để chấm.", [criterion]);
    expect(saved.insert).toHaveBeenCalledExactlyOnceWith({ session_id: "session", question_id: "question", answer_text: shortAnswer, submitted_at: expect.any(String), score: 23, criteria });
    expect(mocks.revalidate).toHaveBeenCalledWith("/interviews/sessions/session");
  });

  it("does not persist a fabricated grade when the provider fails and returns a retryable Vietnamese error", async () => {
    const saved = arrange();
    mocks.evaluate.mockRejectedValue(Object.assign(new Error("private provider details"), { status: 503 }));

    const result = await submitInterviewAnswerAction({}, form(shortAnswer));
    expect(result.error).toContain("AI");
    expect(result.error).toContain("Nội dung vẫn được giữ");
    expect(result.error).not.toContain("private provider details");
    expect(saved.insert).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("distinguishes a database save failure from an evaluation failure without exposing database details", async () => {
    const saved = arrange({ code: "23505", message: "private database details" });
    mocks.evaluate.mockResolvedValue({ score: 0, criteria: [] });

    const result = await submitInterviewAnswerAction({}, form(shortAnswer));
    expect(result.error).toContain("lưu");
    expect(result.error).not.toContain("AI");
    expect(result.error).not.toContain("private database details");
    expect(saved.insert).toHaveBeenCalledOnce();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("rejects an empty response before evaluating or writing", async () => {
    expect((await submitInterviewAnswerAction({}, form("  "))).error).toContain("nhập câu trả lời");
    expect(mocks.userFrom).not.toHaveBeenCalled();
    expect(mocks.serviceFrom).not.toHaveBeenCalled();
    expect(mocks.evaluate).not.toHaveBeenCalled();
  });

  it("never substitutes public rubric labels or keyword scoring when the private source rubric is missing", async () => {
    const saved = arrange(null, { grading_rubric: [], rubric: [criterion], keywords: ["Reactive", "Proactive"] });
    const result = await submitInterviewAnswerAction({}, form(shortAnswer));
    expect(result.error).toContain("tiêu chí chấm từ nguồn");
    expect(mocks.evaluate).not.toHaveBeenCalled();
    expect(saved.insert).not.toHaveBeenCalled();
  });

  it("sends both the private guidance and reference answer to the question-specific evaluator", async () => {
    arrange(null, { guidance: "Giới hạn và điều kiện từ barem.", reference_answer: "Đáp án tham chiếu của đúng câu hỏi." });
    mocks.evaluate.mockResolvedValue({ score: 0, criteria: [] });
    expect(await submitInterviewAnswerAction({}, form(shortAnswer))).toEqual({});
    expect(mocks.evaluate).toHaveBeenCalledWith(shortAnswer, expect.any(String), "Giới hạn và điều kiện từ barem.\n\nĐáp án tham chiếu của đúng câu hỏi.", [criterion]);
  });

  it("does not grade an active legacy demo merely because it still exists in the database", async () => {
    const saved = arrange(null, {}, { slug: "fmcg-brand-round1", is_available: true });
    expect((await submitInterviewAnswerAction({}, form(shortAnswer))).error).toContain("lưu trữ");
    expect(mocks.serviceFrom).not.toHaveBeenCalled();
    expect(mocks.evaluate).not.toHaveBeenCalled();
    expect(saved.insert).not.toHaveBeenCalled();
  });

  it("retains evaluation for a genuinely published company assignment with its private rubric", async () => {
    const saved = arrange(null, {}, { slug: "company-12345678-1234-1234-1234-123456789abc", is_available: true });
    mocks.evaluate.mockResolvedValue({ score: 0, criteria: [] });
    expect(await submitInterviewAnswerAction({}, form(shortAnswer))).toEqual({});
    expect(mocks.evaluate).toHaveBeenCalledOnce();
    expect(saved.insert).toHaveBeenCalledOnce();
  });
});

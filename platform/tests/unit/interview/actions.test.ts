import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  userFrom: vi.fn(), serviceFrom: vi.fn(), evaluate: vi.fn(), revalidate: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn(async () => ({ id: "owner" })) }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn(async () => ({ from: mocks.userFrom })) }));
vi.mock("@/lib/supabase/service-role-client", () => ({ createServiceRoleClient: vi.fn(() => ({ from: mocks.serviceFrom })) }));
vi.mock("@/lib/interview/ai-evaluator", () => ({ evaluateInterviewWithAI: mocks.evaluate }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: vi.fn((path) => { throw new Error(`REDIRECT:${path}`); }) }));
import { completeInterviewSessionAction, submitInterviewAnswerAction } from "@/app/interviews/actions";

function query(data: unknown, error: unknown = null) {
  const result = { data, error };
  const chain = {
    select: vi.fn(() => chain), eq: vi.fn(() => chain), order: vi.fn(() => chain),
    is: vi.fn(() => chain), insert: vi.fn(() => chain), update: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return chain;
}
function form() { const data = new FormData(); data.set("sessionId", "session"); data.set("questionId", "question"); data.set("answerText", "My evidence-based response."); return data; }
beforeEach(() => { vi.clearAllMocks(); });
describe("interview action authorization", () => {
  it("cannot grade an answer in another user's session", async () => {
    mocks.userFrom.mockReturnValue(query({ id: "session", user_id: "other", set_id: "set", completed_at: null }));
    expect((await submitInterviewAnswerAction({}, form())).error).toContain("unavailable");
    expect(mocks.serviceFrom).not.toHaveBeenCalled();
    expect(mocks.evaluate).not.toHaveBeenCalled();
  });
  it("cannot edit a completed interview", async () => {
    mocks.userFrom.mockReturnValue(query({ id: "session", user_id: "owner", set_id: "set", completed_at: "2026-10-16" }));
    expect((await submitInterviewAnswerAction({}, form())).error).toContain("complete");
    expect(mocks.serviceFrom).not.toHaveBeenCalled();
  });
  it("does not accept a foreign or out-of-order question id supplied by the browser", async () => {
    mocks.userFrom.mockImplementation((table: string) => table === "interview_sessions"
      ? query({ id: "session", user_id: "owner", set_id: "set", completed_at: null }) : query([]));
    mocks.serviceFrom.mockReturnValue(query([{ id: "expected", prompt: "The real question", rubric: [], round_number: 1, position: 1 }]));
    expect((await submitInterviewAnswerAction({}, form())).error).toContain("next unanswered");
    expect(mocks.serviceFrom.mock.calls.map((call) => call[0])).toEqual(["interview_questions"]);
    expect(mocks.evaluate).not.toHaveBeenCalled();
  });
  it("cannot finish with an equal answer count from the wrong set", async () => {
    mocks.userFrom.mockImplementation((table: string) => {
      if (table === "interview_sessions") return query({ id: "session", user_id: "owner", set_id: "set", completed_at: null });
      if (table === "interview_questions") return query([{ id: "a", round_number: 1 }, { id: "b", round_number: 2 }, { id: "c", round_number: 3 }]);
      return query([{ question_id: "a", score: 100 }, { question_id: "b", score: 100 }, { question_id: "foreign", score: 100 }]);
    });
    await expect(completeInterviewSessionAction(form())).rejects.toThrow("every question");
    expect(mocks.serviceFrom).not.toHaveBeenCalled();
  });
});

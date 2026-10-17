import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn(async () => ({ from: mocks.from })) }));
import { getCandidateOverview } from "@/lib/report/data";

function query(data: unknown) {
  const result = { data, error: null };
  const chain = { select: vi.fn(() => chain), eq: vi.fn(() => chain), order: vi.fn(() => chain), limit: vi.fn(() => chain), then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve) };
  return chain;
}
beforeEach(() => vi.resetAllMocks());

describe("source-only dashboard and report recommendations", () => {
  it("recommends only current source work while preserving historical progress and records", async () => {
    const current = { id: "source-current", slug: "r2w-it-03", industry: "Công nghệ thông tin", position_title: "Data Analyst", position_id: "IT-03", is_available: true };
    const related = { id: "source-related", slug: "r2w-it-02", industry: "Công nghệ thông tin", position_title: "Software Tester/QA", position_id: "IT-02", is_available: true };
    const legacy = { id: "legacy", slug: "churn-dashboard-spec", industry: "Công nghệ thông tin", position_title: "Data Analyst", position_id: null, is_available: true };
    const currentSet = { id: "source-set", slug: "r2w-data-analyst-20261017", industry: "Công nghệ thông tin", position_title: "Data Analyst", position_id: "IT-03", is_available: true };
    const legacySet = { ...currentSet, id: "legacy-set", slug: "product-company-data-round1" };
    const submissions = [
      { id: "current-result", simulation_id: current.id, overall_score: 70, submitted_at: "2026-10-17T01:00:00Z", criterion_scores: { summary: "Nhận xét đã lưu.", criteria: [] } },
      { id: "legacy-result", simulation_id: legacy.id, overall_score: 80, submitted_at: "2026-10-16T01:00:00Z", criterion_scores: { summary: "Lịch sử cũ vẫn còn.", criteria: [] } },
    ];
    const rows: Record<string, unknown[]> = {
      simulations: [current, related, legacy], candidate_latest_simulation_submissions: submissions,
      interview_sets: [currentSet, legacySet], interview_sessions: [], roadmaps: [], candidate_latest_mentor_reviews: [], candidate_completed_interview_sessions: [],
      cv_analyses: [{ id: "cv", position_id: "IT-03", position_title: "Data Analyst", created_at: "2026-10-17T00:00:00Z", result: { strengths: [], skillGaps: [] } }],
    };
    mocks.from.mockImplementation((table: string) => query(rows[table] ?? []));

    const overview = await getCandidateOverview("owner");
    expect(overview.recommendations.map((item) => item.slug)).toEqual([related.slug]);
    expect(overview.progress.simulation).toEqual({ completed: 2, total: 3, percent: 67 });
    expect(overview.progress.interview.total).toBe(2);
    expect(overview.targetSimulations.map((item) => item.id)).toEqual([current.id]);
    expect(overview.submissions.map((item) => item.id)).toContain("legacy-result");
    expect(overview.simulations.find((item) => item.id === legacy.id)?.position_title).toBe("Data Analyst");
  });
});

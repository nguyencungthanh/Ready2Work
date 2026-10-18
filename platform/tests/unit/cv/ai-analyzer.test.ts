import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/ai/gemini", () => ({ generateStructured: vi.fn() }));
vi.mock("@/lib/observability/logger", () => ({ logger: { warn: vi.fn() } }));
import { generateStructured } from "@/lib/ai/gemini";
import { logger } from "@/lib/observability/logger";
import { analyzeCV } from "@/lib/cv/analyzer";
import { CVAnalysisError } from "@/lib/cv/errors";
import type { GoldenProfile } from "@/lib/content/catalog";

const profile: GoldenProfile = {
  position_id: "TEST", position_name: "Data Analyst", industry_id: "IT", industry_name: "IT",
  hard_skills: [{ skill: "SQL", required_level: "M1", source_requirement_policy: "core", keywords: ["sql"] }],
  tools: [], soft_skills: [], certifications: [],
};
const text = "I built SQL queries to analyze customer records and create business reports.";
function response(evidenceIds = ["cv-0"], status = "matched") {
  return { findings: [{ id: "0", status, evidenceIds, gapDescription: "", recommendedAction: "Tiếp tục thực hành." }] };
}
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("GEMINI_API_KEY", "test-only-key"); });
afterEach(() => vi.unstubAllEnvs());

describe("CV analysis grounded in source excerpts", () => {
  it("reconstructs evidence from the original Unicode/line formatting, ignoring model-written quotes", async () => {
    const original = "Tôi phân tích dữ liệu bằng SQL.\nTôi dùng Excel\tđể lập báo cáo.";
    const raw = response(["cv-1", "cv-0"]);
    vi.mocked(generateStructured).mockResolvedValue({ findings: [{ ...raw.findings[0], candidateEvidence: "invented private text" }] });
    const result = await analyzeCV(original, profile);
    expect(result.provider).toBe("ai");
    expect(result.strengths[0]?.candidateEvidence).toBe("Tôi dùng Excel\tđể lập báo cáo.\nTôi phân tích dữ liệu bằng SQL.");
    expect(result.strengths[0]?.requiredLevel).toBe("M1");
    expect(result.overallMatchScore).toBeNull();
    expect(JSON.stringify(result)).not.toContain("invented");
    expect(generateStructured).toHaveBeenCalledWith(expect.stringContaining('"id":"cv-0"'), expect.any(Object), undefined, { timeoutMs: 35_000 });
  });
  it("requests one correction for an unknown source ID and validates the replacement", async () => {
    vi.mocked(generateStructured).mockResolvedValueOnce(response(["fabricated-source"])).mockResolvedValueOnce(response());
    expect((await analyzeCV(text, profile)).strengths[0]?.candidateEvidence).toBe(text);
    expect(generateStructured).toHaveBeenCalledTimes(2);
    const correction = vi.mocked(generateStructured).mock.calls[1]![0];
    expect(correction).toContain("CV_INVALID_EVIDENCE");
    expect(correction).not.toContain("fabricated-source");
    expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain(text);
  });
  it.each([
    response(["unknown"]), response([], "partial"), response(["cv-0"], "missing"), response(["cv-0", "cv-0"]),
  ])("rejects unsupported, absent, contradictory or duplicate evidence after one correction", async (raw) => {
    vi.mocked(generateStructured).mockResolvedValue(raw);
    await expect(analyzeCV(text, profile)).rejects.toMatchObject({ code: "CV_INVALID_EVIDENCE" });
    expect(generateStructured).toHaveBeenCalledTimes(2);
  });
  it("accepts a missing finding without manufacturing evidence or a rule-based fallback", async () => {
    vi.mocked(generateStructured).mockResolvedValue(response([], "missing"));
    const result = await analyzeCV(text, profile);
    expect(result.provider).toBe("ai");
    expect(result.strengths).toHaveLength(0);
    expect(result.skillGaps[0]?.candidateEvidence).toBe("");
    expect(generateStructured).toHaveBeenCalledOnce();
  });
  it.each([
    { findings: [] },
    { findings: [response().findings[0], response().findings[0]] },
    { findings: [{ ...response().findings[0], id: "unknown" }] },
  ])("rejects incomplete, duplicate or foreign requirements after one correction", async (raw) => {
    vi.mocked(generateStructured).mockResolvedValue(raw);
    await expect(analyzeCV(text, profile)).rejects.toMatchObject({ code: "CV_INCOMPLETE_ANALYSIS" });
    expect(generateStructured).toHaveBeenCalledTimes(2);
  });
  it.each([{}, { findings: [{ id: "0", evidenceIds: ["cv-0"] }] }])("recovers invalid response schemas once", async (raw) => {
    vi.mocked(generateStructured).mockResolvedValueOnce(raw).mockResolvedValueOnce(response());
    expect((await analyzeCV(text, profile)).provider).toBe("ai");
    expect(vi.mocked(generateStructured).mock.calls[1]![0]).toContain("CV_INVALID_RESPONSE");
  });
  it.each([new SyntaxError("private invalid JSON"), new Error("Gemini returned an empty response.")])("recovers malformed or empty output once without echoing the provider error", async (error) => {
    vi.mocked(generateStructured).mockRejectedValueOnce(error).mockResolvedValueOnce(response());
    expect((await analyzeCV(text, profile)).provider).toBe("ai");
    expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain("private");
  });
});

describe("CV analysis provider recovery", () => {
  it("retries a temporary 503 once", async () => {
    vi.mocked(generateStructured).mockRejectedValueOnce({ status: 503 }).mockResolvedValueOnce(response());
    expect((await analyzeCV(text, profile)).provider).toBe("ai");
    expect(generateStructured).toHaveBeenCalledTimes(2);
  });
  it.each([429, 400, 401, 403])("does not retry provider HTTP %s or fabricate a rules result", async (status) => {
    vi.mocked(generateStructured).mockRejectedValue({ status });
    await expect(analyzeCV(text, profile)).rejects.toEqual({ status });
    expect(generateStructured).toHaveBeenCalledOnce();
  });
  it("shares the two-call limit between service failures and invalid output", async () => {
    vi.mocked(generateStructured).mockRejectedValueOnce({ status: 503 }).mockResolvedValue(response(["unknown"]));
    await expect(analyzeCV(text, profile)).rejects.toBeInstanceOf(CVAnalysisError);
    expect(generateStructured).toHaveBeenCalledTimes(2);
  });
  it("stops after the second 503", async () => {
    vi.mocked(generateStructured).mockRejectedValue({ status: 503 });
    await expect(analyzeCV(text, profile)).rejects.toEqual({ status: 503 });
    expect(generateStructured).toHaveBeenCalledTimes(2);
  });
  it("retries a timed out analysis once", async () => {
    vi.mocked(generateStructured).mockRejectedValueOnce(new DOMException("timeout", "TimeoutError")).mockResolvedValueOnce(response());
    expect((await analyzeCV(text, profile)).provider).toBe("ai");
    expect(generateStructured).toHaveBeenCalledTimes(2);
  });
});

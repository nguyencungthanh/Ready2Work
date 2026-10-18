import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/ai/gemini", () => ({ generateStructured: vi.fn() }));
import { generateStructured } from "@/lib/ai/gemini";
import { analyzeCV, profileRequirements } from "@/lib/cv/analyzer";
import type { GoldenProfile } from "@/lib/content/catalog";

const profile: GoldenProfile = {
  position_id: "TEST", position_name: "Data Analyst", industry_id: "IT", industry_name: "IT",
  hard_skills: [{ skill: "SQL", required_level: "M1", source_requirement_policy: "core", keywords: ["sql"] }],
  tools: [], soft_skills: [], certifications: [],
};
const text = "I built SQL queries to analyze customer records and create business reports.";
function response(evidence = "SQL queries") {
  return { findings: [{ id: profileRequirements(profile)[0]!.id, status: "matched", candidateEvidence: evidence, gapDescription: "", recommendedAction: "Tiếp tục thực hành." }] };
}
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("GEMINI_API_KEY", "test-only-key"); });
afterEach(() => vi.unstubAllEnvs());

describe("CV analysis provider recovery", () => {
  it("retries a temporary 503 once and still validates the returned evidence", async () => {
    vi.mocked(generateStructured).mockRejectedValueOnce({ status: 503 }).mockResolvedValueOnce(response());
    expect((await analyzeCV(text, profile)).provider).toBe("ai");
    expect(generateStructured).toHaveBeenCalledTimes(2);
  });
  it("does not retry exhausted quota or fabricate a rules result after an AI failure", async () => {
    vi.mocked(generateStructured).mockRejectedValue({ status: 429 });
    await expect(analyzeCV(text, profile)).rejects.toEqual({ status: 429 });
    expect(generateStructured).toHaveBeenCalledOnce();
  });
  it("stops after the second 503 and rejects fabricated evidence after a recovery", async () => {
    vi.mocked(generateStructured).mockRejectedValue({ status: 503 });
    await expect(analyzeCV(text, profile)).rejects.toEqual({ status: 503 });
    expect(generateStructured).toHaveBeenCalledTimes(2);
    vi.mocked(generateStructured).mockReset().mockRejectedValueOnce({ status: 503 }).mockResolvedValueOnce(response("fabricated experience"));
    await expect(analyzeCV(text, profile)).rejects.toThrow("evidence not present");
  });
});

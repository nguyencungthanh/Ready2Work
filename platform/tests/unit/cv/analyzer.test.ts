import { describe, expect, it } from "vitest";
import { analyzeCVWithRules, profileRequirements } from "@/lib/cv/analyzer";
import type { GoldenProfile } from "@/lib/content/catalog";

const profile: GoldenProfile = {
  position_id: "TEST", position_name: "Data Analyst", industry_id: "IT", industry_name: "IT",
  hard_skills: [{ skill: "SQL", weight: 5, keywords: ["sql"] }],
  tools: [{ tool: "Excel", weight: 3, keywords: ["excel"] }],
  soft_skills: [{ skill: "Communication", keywords: ["communication"] }],
  certifications: [{ name: "Required Certificate", priority: "Bắt buộc", keywords: ["certificate"] }, { name: "Bonus", priority: "Cộng điểm", keywords: ["bonus"] }],
};
describe("source-defined CV scoring", () => {
  it("uses certification priorities and excludes unweighted soft skills from the denominator", () => {
    const result = analyzeCVWithRules("I used SQL to analyze customer records. Communication is a strength.", profile);
    expect(profileRequirements(profile).map((r) => r.weight)).toEqual([5, 3, 0, 5, 1]);
    expect(result.overallMatchScore).toBe(Math.round(5 / 14 * 100));
    expect(result.provider).toBe("rules");
    expect(result.strengths.find((f) => f.skillName === "SQL")?.candidateEvidence).toBe("I used SQL to analyze customer records");
  });
  it("does not confuse NoSQL with SQL", () => {
    expect(analyzeCVWithRules("I worked with NoSQL databases and customer records.", profile).strengths).toHaveLength(0);
  });
  it("never claims a missing CV keyword proves the candidate lacks a skill", () => {
    expect(analyzeCVWithRules("A description of work with no listed technical keywords.", profile).skillGaps.every((f) => f.gapDescription.includes("CV chưa thể hiện"))).toBe(true);
  });
  it("preserves source levels without inventing percentages or mandatory JD/advantage gaps", () => {
    const sourceProfile: GoldenProfile = { ...profile, hard_skills: [
      { skill: "SQL", required_level: "M1", source_requirement_policy: "core", keywords: ["sql"] },
      { skill: "Python", required_level: "M3", source_requirement_policy: "conditional", keywords: ["python"] },
      { skill: "R", required_level: "M4", source_requirement_policy: "advantage", keywords: ["r"] },
    ], tools: [], soft_skills: [], certifications: [] };
    const result = analyzeCVWithRules("I used SQL to analyze customer records.", sourceProfile);
    expect(result.overallMatchScore).toBeNull();
    expect(result.scoringMethod).toBe("qualitative");
    expect(result.strengths[0]?.requiredLevel).toBe("M1");
    expect(result.skillGaps).toHaveLength(0);
    expect(result.recommendedLearningPath).toHaveLength(0);
    expect(result.additionalRequirements?.map((finding) => finding.requirementPolicy)).toEqual(["conditional", "advantage"]);
  });
});

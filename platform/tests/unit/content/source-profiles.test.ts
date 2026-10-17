import { describe, expect, it } from "vitest";
import profiles from "@/data/golden-profiles.json";
import source from "@/data/source/requirements-20261017.json";

type Paragraph = { text: string };
type SourceTable = { index: number; type: "table"; rows: Paragraph[][][] };
type Requirement = { skill?: string; tool?: string; name?: string; description?: string; required_level?: string; source_requirement_policy?: string; weight?: number };
type Profile = { position_id: string; hard_skills: Requirement[]; soft_skills: Requirement[]; tools: Requirement[]; certifications: Requirement[] };
const allProfiles = (profiles as unknown as { industries: { positions: Profile[] }[] }).industries.flatMap((industry) => industry.positions);
const getProfile = (id: string) => allProfiles.find((profile) => profile.position_id === id)!;
const table = (index: number) => source.blocks.find((block) => block.index === index) as unknown as SourceTable;
const text = (paragraphs: Paragraph[]) => paragraphs.map((paragraph) => paragraph.text).join("\n");
const normalize = (value: string) => value.normalize("NFC").replace(/\s+/g, " ").trim();
const policy = (position: string, level: string) => level === "M1" ? "core" : level === "M2" ? "common" : position.startsWith("MKT-") || level === "M4" ? "advantage" : "conditional";

describe("Golden Profiles preserve the source requirements", () => {
  it("contains every level and requirement from all twelve compact source tables without adding numeric weights or unsupported certificates", () => {
    const tables = { "MKT-01": 271, "MKT-02": 273, "MKT-03": 275, "KK-01": 388, "KK-02": 390, "KK-03": 392, "TCNH-02": 435, "TCNH-01": 437, "TCNH-03": 439, "LOG-01": 481, "LOG-02": 484, "LOG-03": 487 };
    for (const [id, index] of Object.entries(tables)) {
      const profile = getProfile(id);
      expect(profile, id).toBeDefined();
      const expected: string[] = [];
      for (const row of table(index).rows.slice(1)) {
        const level = text(row[0]!).match(/M[1-4]/)?.[0];
        if (!level) continue;
        for (const [column, key] of [[1, "hard_skills"], [2, "soft_skills"], [3, "tools"]] as const) {
          const lines = text(row[column]!).split("\n").map((line) => line.replace(/^[HST]\d+\s+/, "").trim()).filter((line) => line && !/^[–—-]$/.test(line));
          expected.push(...lines.map((name) => `${key}|${level}|${normalize(name)}|${policy(id, level)}`));
        }
      }
      const actual = (["hard_skills", "soft_skills", "tools"] as const).flatMap((key) => profile[key].map((requirement) => {
        expect(requirement.weight, `${id}: source does not assign numeric CV weights`).toBeUndefined();
        return `${key}|${requirement.required_level}|${normalize(requirement.skill || requirement.tool || "")}|${requirement.source_requirement_policy}`;
      }));
      expect(actual.sort(), id).toEqual(expected.sort());
      expect(profile.certifications, `${id}: no certificates appear in its source table`).toEqual([]);
    }
  });

  it("keeps IT's exact names, proficiency descriptions and levels from its detailed source tables", () => {
    const tables = { "IT-01": [329, 331, 333], "IT-02": [338, 340, 342], "IT-03": [347, 349, 351] };
    const categories = ["hard_skills", "soft_skills", "tools"] as const;
    for (const [id, indexes] of Object.entries(tables)) {
      const profile = getProfile(id);
      indexes.forEach((index, category) => {
        const key = categories[category]!;
        const rows = table(index).rows.slice(1);
        expect(profile[key], `${id}, table ${index}`).toHaveLength(rows.length);
        rows.forEach((row, rowIndex) => {
          const requirement = profile[key][rowIndex]!;
          const level = normalize(text(row[3]!));
          expect(normalize(requirement.skill || requirement.tool || "")).toBe(normalize(text(row[1]!)));
          expect(normalize(requirement.description || "")).toBe(normalize(text(row[2]!)));
          expect(requirement.required_level).toBe(level);
          expect(requirement.source_requirement_policy).toBe(policy(id, level));
          expect(requirement.weight).toBeUndefined();
        });
      });
    }
  });

  it("distinguishes Marketing M3 advantages from conditional M3 requirements and preserves optional source certificates", () => {
    expect(getProfile("MKT-01").soft_skills.find((requirement) => requirement.required_level === "M3")?.source_requirement_policy).toBe("advantage");
    expect(getProfile("IT-02").hard_skills.find((requirement) => requirement.required_level === "M3")?.source_requirement_policy).toBe("conditional");
    expect(getProfile("IT-01").certifications.map((requirement) => [requirement.name, requirement.source_requirement_policy])).toEqual([["IIBA ECBA", "advantage"], ["PSM I / CSM", "conditional"]]);
    expect(getProfile("IT-02").certifications.map((requirement) => requirement.source_requirement_policy)).toEqual(["advantage"]);
    expect(getProfile("IT-03").certifications.map((requirement) => requirement.source_requirement_policy)).toEqual(["advantage", "advantage"]);
  });
});

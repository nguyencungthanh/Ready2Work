import { describe, expect, it } from "vitest";
import supplement from "@/data/source/marketing-inputs-20261017.json";
import tasks from "@/data/task-rubrics.json";

const number = (value: string) => Number(value.replaceAll(".", "").replace(",", ".").replace("%", ""));
describe("authorized Marketing exercise inputs", () => {
  it("publishes each approved input once from the canonical supplement, including Vietnamese wording changes", () => {
    const marketing = tasks.industries.find((industry) => industry.industry_id === "MKT")!;
    for (const [position, materials] of Object.entries(supplement.by_position)) {
      const published = marketing.tasks.find((task) => task.position_id === position)!.public_materials;
      for (const material of materials) expect(published.filter((item) => item.id === material.id)).toEqual([material]);
    }
  });
  it("keeps the source's explanation of three causes under its 15-point item, separate from the 10-point CPL calculation", () => {
    const task = tasks.industries.find((industry) => industry.industry_id === "MKT")!.tasks.find((item) => item.position_id === "MKT-02")!;
    const [causes, cpl, testPlan] = task.rubric[0]!.checklist;
    expect(causes!.points).toBe(15);
    expect(causes!.text).toContain("targeting quá rộng");
    expect(causes!.text).toContain("form 7 trường");
    expect(causes!.text).not.toContain("Tính đúng CPL mục tiêu");
    expect(cpl!.points).toBe(10);
    expect(cpl!.text).toContain("15.000.000 ÷ 92 lead");
    expect(cpl!.text).not.toContain("targeting quá rộng");
    expect(testPlan!.points).toBe(10);
  });
  it("reconciles the two advertising groups to the supplied 5M, 62,500 impressions, 500 clicks and eight leads", () => {
    const rows = supplement.by_position["MKT-02"][0]!.rows;
    const [a, b, total] = rows;
    for (const index of [2, 3, 4, 5]) expect(number(a![index]!) + number(b![index]!)).toBe(number(total![index]!));
    expect(number(total![2]!)).toBe(5_000_000);
    expect(number(total![3]!)).toBe(62_500);
    expect(number(total![4]!)).toBe(500);
    expect(number(total![5]!)).toBe(8);
    expect(number(a![2]!) / number(a![5]!)).toBe(1_000_000);
    expect(number(b![2]!) / number(b![5]!)).toBe(400_000);
    expect(number(a![4]!) / number(a![3]!) * 100).toBeCloseTo(.6);
    expect(number(total![2]!) / number(total![5]!)).toBe(625_000);
  });
  it("provides twelve distinct keyword candidates and clearly identifies generated facts as simulation data", () => {
    const seo = supplement.by_position["MKT-03"][0]!;
    expect(seo.rows).toHaveLength(12);
    expect(new Set(seo.rows.map((row) => row[0])).size).toBe(12);
    expect(seo.rows.filter((row) => number(row[2]!) <= 30).length).toBeGreaterThanOrEqual(5);
    for (const materials of Object.values(supplement.by_position)) for (const material of materials) {
      expect(material.provenance).toContain("mô phỏng");
      expect(material.provenance).toContain("chủ dự án");
    }
  });
});

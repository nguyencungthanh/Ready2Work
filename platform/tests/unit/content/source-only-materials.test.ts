import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import tasks from "@/data/task-rubrics.json";

describe("document-only task materials", () => {
  it("removes the generated Marketing supplement from runtime inputs and marks its genuinely missing source inputs", async () => {
    await expect(access(resolve(process.cwd(), "data/source/marketing-inputs-20261017.json"))).rejects.toMatchObject({ code: "ENOENT" });
    const marketing = tasks.industries.find((industry) => industry.industry_id === "MKT")!;
    for (const task of marketing.tasks) {
      expect(task.grading_ready, task.position_id).toBe(false);
      expect("missing_source_inputs" in task && Array.isArray(task.missing_source_inputs) && task.missing_source_inputs.length > 0, task.position_id).toBe(true);
      expect(task.public_materials.some((material) => material.id.startsWith("marketing-")), task.position_id).toBe(false);
      const serialized = JSON.stringify(task.public_materials);
      expect(serialized).not.toContain("65% sợi bông");
      expect(serialized).not.toContain("399.000");
      expect(serialized).not.toContain("359.000");
      expect(serialized).not.toContain('"1.300","22"');
    }
  });

  it("preserves source-authored Marketing rubric points without turning generated input assumptions into new criteria", () => {
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

  it("renders IT Data Analyst's actual nested source table with its original five columns and row labels", () => {
    const task = tasks.industries.find((industry) => industry.industry_id === "IT")!.tasks.find((item) => item.position_id === "IT-03")!;
    const material = task.public_materials.find((item) => item.id === "coffee-input")!;
    expect("columns" in material ? material.columns : null).toEqual(["Chi nhánh", "Tháng 5 (đơn/ doanh thu)", "Tháng 6", "Tháng 7", "Tháng 8"]);
    expect("rows" in material ? material.rows : null).toEqual([
      ["Q1", "420 đơn / 21.0tr", "460 đơn / 23.0tr", "510 đơn / 25.5tr", "560 đơn / 28.0tr"],
      ["Q3", "380 đơn / 19.0tr", "400 đơn / 20.0tr", "390 đơn / 19.5tr", "405 đơn / 20.3tr"],
      ["Bình Thạnh", "300 đơn / 15.0tr", "340 đơn / 17.0tr", "400 đơn / 20.0tr", "470 đơn / 23.5tr"],
      ["Thủ Đức", "250 đơn / 12.5tr", "245 đơn / 12.3tr", "240 đơn / 12.0tr", "238 đơn / 11.9tr"],
    ]);
  });
});

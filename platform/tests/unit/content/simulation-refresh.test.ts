import { describe, expect, it } from "vitest";
import tasks from "@/data/task-rubrics.json";
import snapshot from "@/data/source/simulations-20261019.json";
import marketing from "@/data/source/marketing-inputs-20261019.json";
import adjustments from "@/data/source/simulation-adjustments-20261019.json";
import { isCurrentSourceRevision } from "@/lib/content/source-catalog";
import { validateCurrentSourceTask } from "@/lib/simulation/source-evaluator";
import { publicSimulationMaterials } from "@/lib/simulation/materials";

const all = tasks.industries.map((industry) => industry.tasks).flat();
const task = (id: string) => all.find((item) => item.position_id === id)!;
const norm = (value: string) => value.normalize("NFC").replace(/\s+/g, " ").trim();

describe("reviewed simulation source refresh", () => {
  it("has fifteen available, version-validated tasks with internally consistent 100-point rubrics", () => {
    expect(all).toHaveLength(15);
    expect(Object.keys(snapshot.tasks)).toHaveLength(15);
    for (const item of all) {
      expect(isCurrentSourceRevision(item), item.position_id).toBe(true);
      expect(() => validateCurrentSourceTask(item), item.position_id).not.toThrow();
      expect(item.grading_ready, item.position_id).toBe(true);
      expect(item.rubric.reduce((sum, c) => sum + c.max_points, 0)).toBe(100);
      for (const c of item.rubric) expect(c.checklist.reduce((sum, row) => sum + row.points, 0)).toBe(c.max_points);
    }
  });

  it("uses the corrected finance source maxima and keeps requirement subparts grouped", () => {
    expect(task("TCNH-01").rubric.map((c) => c.max_points)).toEqual([30, 30, 30, 10]);
    expect(task("TCNH-02").rubric.map((c) => c.max_points)).toEqual([35, 25, 30, 10]);
    expect(task("TCNH-03").rubric.map((c) => c.max_points)).toEqual([30, 30, 30, 10]);
    for (const id of ["TCNH-01", "TCNH-02", "TCNH-03"] as const) {
      const expected = snapshot.tasks[id].cells[2]!.map((p) => p.text).join("\n");
      expect(norm(task(id).requirements.join("\n"))).toBe(norm(expected));
      expect(task(id).requirements.join("\n").match(/Nhiệm vụ [123]:/g)).toHaveLength(3);
    }
    expect(task("TCNH-01").requirements.join("\n")).toContain("5 nguyên nhân");
    expect(task("TCNH-01").requirements.join("\n")).toContain("5 nhận định");
    expect(task("TCNH-02").rubric[2]!.checklist[0]!.text).toContain("hạn mức ≤ 4,9 tỷ");
    expect(task("TCNH-03").rubric[1]!.checklist[2]!.text).toContain("Chỉ nêu tên không chỉ ra cơ chế");
  });

  it("records the owner's correction without changing the original source snapshot", () => {
    expect(snapshot.tasks["TCNH-01"].cells[3]!.some((p) => p.text.includes("mỗi giải pháp 6 điểm"))).toBe(true);
    expect(adjustments.adjustments[0]!.approved_points_per_solution).toBe(10);
    expect(task("TCNH-01").rubric[2]!.checklist.map((c) => c.points)).toEqual([10, 10, 10]);
    expect(task("TCNH-01").source_policy).toBe("document_with_authorized_supplements");
    expect(task("KK-01").rubric[1]!.description).toContain("từ 9 chỗ trở xuống");
  });

  it("rejects superseded revisions per position while accepting untouched source tasks", () => {
    expect(isCurrentSourceRevision({ ...task("TCNH-02"), source_version: "20261017", content_revision: "20261017-doc-only" })).toBe(false);
    expect(isCurrentSourceRevision(task("IT-03"))).toBe(true);
    expect(isCurrentSourceRevision({ ...task("MKT-01"), source_policy: "document_only" })).toBe(false);
    expect(isCurrentSourceRevision({ ...task("IT-01"), position_id: "unknown" })).toBe(false);
  });

  it("balances every Marketing ad aggregate and supplies twelve distinct SEO input candidates", () => {
    const rows = marketing.by_position["MKT-02"][0]!.rows;
    for (let column = 1; column <= 4; column++) expect(Number(rows[0]![column]) + Number(rows[1]![column])).toBe(Number(rows[2]![column]));
    expect(rows[2]!.slice(1).map(Number)).toEqual([5_000_000, 62_500, 500, 8]);
    expect(Number(rows[0]![1]) / Number(rows[0]![4])).toBe(1_000_000);
    expect(Number(rows[1]![1]) / Number(rows[1]![4])).toBe(400_000);
    const keywords = marketing.by_position["MKT-03"][0]!.rows;
    expect(keywords).toHaveLength(12);
    expect(new Set(keywords.map((r) => r[0])).size).toBe(12);
    expect(keywords.filter((r) => Number(r[2]) <= 30).length).toBeGreaterThanOrEqual(5);
    for (const id of ["MKT-01", "MKT-02", "MKT-03"] as const) {
      const exposed = JSON.stringify(publicSimulationMaterials(task(id)));
      expect(exposed).toContain("Dữ liệu mô phỏng");
      expect(exposed).not.toMatch(/checklist_id|awardedPoints|source_adjustments|source_rubric_text|source_conflicts/);
    }
  });
});

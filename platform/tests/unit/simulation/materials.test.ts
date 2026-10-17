import { describe, expect, it } from "vitest";
import { publicSimulationMaterials, serializeSubmissionTable } from "@/lib/simulation/materials";

describe("source reference materials", () => {
  it("exposes only explicitly public material fields and local source assets", () => {
    const result = publicSimulationMaterials({ private_answer: "not public", public_materials: [{ id: "source", title: "Hồ sơ", kind: "image", href: "/materials/ho-so.png", grading_notes: "not public" }, { id: "bad", title: "External", kind: "pdf", href: "https://outside.invalid/private" }] });
    expect(result[0]).not.toHaveProperty("grading_notes");
    expect(result[0]?.href).toBe("/materials/ho-so.png");
    expect(result[1]?.href).toBeUndefined();
    expect(publicSimulationMaterials({ artifacts: { private_answer: "not public" } })).toEqual([]);
  });
  it("serializes filled table cells into the answer, with separators escaped", () => {
    expect(serializeSubmissionTable("Bảng thẩm định", ["Chỉ tiêu", "Nhận xét"], [["Doanh thu", "Tăng | cần kiểm tra\nthêm"]])).toContain("Doanh thu | Tăng \\| cần kiểm tra thêm");
  });
});

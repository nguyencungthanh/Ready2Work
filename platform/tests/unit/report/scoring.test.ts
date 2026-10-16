import { describe, expect, it } from "vitest";
import { calculateReadiness, newestBy, readinessBadge } from "@/lib/report/scoring";

describe("candidate readiness", () => {
  it("keeps the specified 30/40/30 weights", () => {
    expect(calculateReadiness(100, 50, 80).score).toBe(74);
  });
  it("does not fabricate or renormalize an absent mentor assessment", () => {
    const result = calculateReadiness(100, 75, null);
    expect(result.score).toBeNull();
    expect(result.components[2]?.score).toBeNull();
    expect(result.weightedPoints).toBe(60);
  });
  it("treats a recorded zero as evidence, rather than missing data", () => {
    expect(calculateReadiness(0, 0, 0).score).toBe(0);
  });
  it("uses inclusive Junior boundaries and the strict Global boundary", () => {
    expect(readinessBadge(59)).toBe("Cần luyện tập thêm");
    expect(readinessBadge(60)).toBe("Sẵn sàng ứng tuyển Junior");
    expect(readinessBadge(80)).toBe("Sẵn sàng ứng tuyển Junior");
    expect(readinessBadge(81)).toContain("Global");
  });
  it("rejects incomparable or invalid input scales", () => {
    expect(() => calculateReadiness(100, 300, 80)).toThrow();
    expect(() => calculateReadiness(100, Number.NaN, 80)).toThrow();
  });
  it("counts a retried task once and retains the newest recorded score", () => {
    const rows = [{ task: "a", score: 70 }, { task: "a", score: 90 }, { task: "b", score: 50 }];
    expect(newestBy(rows, (row) => row.task)).toEqual([rows[0], rows[2]]);
  });
});

import { describe, expect, it } from "vitest";
import { recommendSimulations } from "@/lib/report/recommendations";

const simulations = [
  { id: "related", position_id: "IT-02", industry: "IT" },
  { id: "target", position_id: "IT-03", industry: "IT" },
  { id: "other", position_id: "MKT-01", industry: "Marketing" },
];
describe("career simulation recommendations", () => {
  it("recommends the CV target before related work, without requiring an earlier submission", () => {
    expect(recommendSimulations(simulations, [], "IT-03").map((s) => s.id)).toEqual(["target", "related"]);
  });
  it("excludes graded work while keeping unfinished work eligible", () => {
    expect(recommendSimulations(simulations, [{ simulation_id: "target", overall_score: 0 }, { simulation_id: "related", overall_score: null }], "IT-03").map((s) => s.id)).toEqual(["related"]);
  });
  it("uses completed industries when no target exists, without inventing a recommendation for an empty account", () => {
    expect(recommendSimulations(simulations, [], null)).toEqual([]);
    expect(recommendSimulations(simulations, [{ simulation_id: "related", overall_score: 75 }], null).map((s) => s.id)).toEqual(["target"]);
  });
  it("does not send candidates into content that has not opened", () => {
    expect(recommendSimulations([{ ...simulations[1]!, is_available: false }], [], "IT-03")).toEqual([]);
  });
});

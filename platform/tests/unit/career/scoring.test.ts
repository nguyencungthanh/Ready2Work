import { describe, expect, it } from "vitest";
import {
  matchScore,
  rankCareers,
  scoreAssessment,
  topDimensions,
  type CareerProfile,
  type ScoredQuestion,
} from "@/lib/career/scoring";

const questions: ScoredQuestion[] = [
  { id: "r1", dimension: "realistic" },
  { id: "r2", dimension: "realistic" },
  { id: "i1", dimension: "investigative" },
  { id: "a1", dimension: "artistic" },
  { id: "s1", dimension: "social" },
  { id: "e1", dimension: "enterprising" },
  { id: "c1", dimension: "conventional" },
];

describe("scoreAssessment", () => {
  it("maps the lowest Likert value to 0 and the highest to 100", () => {
    const low = scoreAssessment(questions, { r1: 1, r2: 1 });
    const high = scoreAssessment(questions, { r1: 5, r2: 5 });

    expect(low.realistic).toBe(0);
    expect(high.realistic).toBe(100);
  });

  it("maps the midpoint to 50", () => {
    expect(scoreAssessment(questions, { i1: 3 }).investigative).toBe(50);
  });

  it("averages within a dimension rather than summing", () => {
    // 1 and 5 average to 3, the midpoint.
    expect(scoreAssessment(questions, { r1: 1, r2: 5 }).realistic).toBe(50);
  });

  it("is deterministic for identical answers", () => {
    const answers = { r1: 4, r2: 2, i1: 5, a1: 1, s1: 3, e1: 4, c1: 2 };
    expect(scoreAssessment(questions, answers)).toEqual(scoreAssessment(questions, answers));
  });

  it("scores an unanswered dimension 0 instead of dividing by zero", () => {
    const scores = scoreAssessment(questions, { r1: 5 });
    expect(scores.social).toBe(0);
    expect(Number.isNaN(scores.social)).toBe(false);
  });

  it("clamps out-of-range answers instead of distorting the scale", () => {
    expect(scoreAssessment(questions, { i1: 99 }).investigative).toBe(100);
    expect(scoreAssessment(questions, { i1: -5 }).investigative).toBe(0);
  });

  it("ignores answers for unknown question ids", () => {
    const scores = scoreAssessment(questions, { unknown: 5, i1: 5 });
    expect(scores.investigative).toBe(100);
  });
});

const career = (id: string, profile: Partial<CareerProfile>): CareerProfile => ({
  id,
  realistic: 0,
  investigative: 0,
  artistic: 0,
  social: 0,
  enterprising: 0,
  conventional: 0,
  ...profile,
});

describe("matchScore", () => {
  it("returns 100 for an exact profile match", () => {
    const user = {
      realistic: 50,
      investigative: 50,
      artistic: 50,
      social: 50,
      enterprising: 50,
      conventional: 50,
    };
    expect(matchScore(user, career("c", user))).toBe(100);
  });

  it("returns 0 when every dimension is maximally opposed", () => {
    const user = {
      realistic: 100,
      investigative: 100,
      artistic: 100,
      social: 100,
      enterprising: 100,
      conventional: 100,
    };
    expect(matchScore(user, career("c", {}))).toBe(0);
  });

  it("scores a closer career higher than a distant one", () => {
    const user = {
      realistic: 10,
      investigative: 90,
      artistic: 20,
      social: 30,
      enterprising: 40,
      conventional: 80,
    };
    const close = career("close", { investigative: 85, conventional: 75, realistic: 15 });
    const far = career("far", { artistic: 95, social: 90 });

    expect(matchScore(user, close)).toBeGreaterThan(matchScore(user, far));
  });
});

describe("rankCareers", () => {
  const user = {
    realistic: 0,
    investigative: 100,
    artistic: 0,
    social: 0,
    enterprising: 0,
    conventional: 50,
  };

  it("orders careers by descending match score", () => {
    const ranked = rankCareers(user, [
      career("artistic-one", { artistic: 100 }),
      career("analyst", { investigative: 100, conventional: 50 }),
    ]);

    expect(ranked[0]?.career.id).toBe("analyst");
    expect(ranked[0]!.score).toBeGreaterThan(ranked[1]!.score);
  });

  it("breaks ties deterministically so repeated runs match", () => {
    const identical = [career("b-career", {}), career("a-career", {})];
    const first = rankCareers(user, identical).map((r) => r.career.id);
    const second = rankCareers(user, [...identical].reverse()).map((r) => r.career.id);

    expect(first).toEqual(second);
    expect(first[0]).toBe("a-career");
  });
});

describe("topDimensions", () => {
  it("returns the strongest dimensions first", () => {
    const scores = {
      realistic: 10,
      investigative: 95,
      artistic: 20,
      social: 80,
      enterprising: 5,
      conventional: 60,
    };
    expect(topDimensions(scores)).toEqual(["investigative", "social", "conventional"]);
  });
});

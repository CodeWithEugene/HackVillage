import { describe, expect, it } from "vitest";

import {
  computeResults,
  DEFAULT_RUBRIC,
  feedbackGateSatisfied,
  validateRubric,
} from "@/lib/judging/compute";

describe("rubric validation (Decision D4)", () => {
  it("accepts the platform template", () => {
    expect(validateRubric(DEFAULT_RUBRIC)).toBeNull();
  });

  it("accepts organizer-tuned rubrics that sum to 100", () => {
    expect(
      validateRubric([
        { id: "depth", label: "Technical depth", weight: 50 },
        { id: "demo", label: "Demo quality", weight: 30 },
        { id: "docs", label: "Documentation", weight: 20 },
      ])
    ).toBeNull();
  });

  it("rejects fewer than 3 criteria", () => {
    const error = validateRubric([
      { id: "depth", label: "Depth", weight: 100 },
    ]);
    expect(error).toContain("at least 3");
  });

  it("rejects weights that don't total 100", () => {
    const error = validateRubric([
      { id: "aa", label: "Alpha", weight: 30 },
      { id: "bb", label: "Beta", weight: 30 },
      { id: "cc", label: "Gamma", weight: 30 },
    ]);
    expect(error).toContain("90");
  });

  it("rejects duplicate criterion ids", () => {
    const error = validateRubric([
      { id: "aa", label: "Alpha", weight: 40 },
      { id: "aa", label: "Alpha again", weight: 30 },
      { id: "cc", label: "Gamma", weight: 30 },
    ]);
    expect(error).toContain("unique");
  });
});

describe("feedback gate", () => {
  it("requires one strength, one improvement, and one next step", () => {
    expect(feedbackGateSatisfied([])).toBe(false);
    expect(
      feedbackGateSatisfied([{ kind: "STRENGTH" }, { kind: "STRENGTH" }, { kind: "STRENGTH" }])
    ).toBe(false);
    expect(
      feedbackGateSatisfied([
        { kind: "STRENGTH" },
        { kind: "IMPROVEMENT" },
        { kind: "NEXT_STEP" },
      ])
    ).toBe(true);
    expect(
      feedbackGateSatisfied([
        { kind: "STRENGTH" },
        { kind: "IMPROVEMENT" },
        { kind: "NEXT_STEP" },
        { kind: "IMPROVEMENT" },
      ])
    ).toBe(true);
  });
});

describe("weighted results computation", () => {
  const rubric = [
    { id: "execution", label: "Execution", weight: 60 },
    { id: "impact", label: "Impact", weight: 40 },
  ];

  it("computes weighted team scores as judge means on a 0–100 scale", () => {
    const { results } = computeResults(rubric, [
      {
        teamId: "t1",
        judges: [{ judgeId: "j1", scores: { execution: 10, impact: 5 } }],
      },
    ]);

    // (10×60 + 5×40) / 100 = 8 → ×10 = 80.00
    expect(results[0]).toMatchObject({ teamId: "t1", weightedScore: 80, rank: 1, judgeCount: 1 });
  });

  it("averages across judges and ranks desc with dense ties", () => {
    const { results } = computeResults(rubric, [
      {
        teamId: "a",
        judges: [
          { judgeId: "j1", scores: { execution: 10, impact: 10 } }, // 100
          { judgeId: "j2", scores: { execution: 8, impact: 10 } }, // 88
        ],
      },
      {
        teamId: "b",
        judges: [
          { judgeId: "j1", scores: { execution: 8, impact: 10 } }, // 88
          { judgeId: "j2", scores: { execution: 8, impact: 10 } }, // 88
        ],
      },
      {
        teamId: "c",
        judges: [{ judgeId: "j1", scores: { execution: 4, impact: 5 } }], // 44
      },
    ]);

    expect(results.map((r) => r.teamId)).toEqual(["a", "b", "c"]);
    expect(results[0].weightedScore).toBe(94); // (100+88)/2
    expect(results[1].weightedScore).toBe(88);
    // a=rank 1; b (88) ties with a? No — 94 vs 88 → b rank 2, c rank 3.
    expect(results[1].rank).toBe(2);
    expect(results[2].rank).toBe(3);
  });

  it("gives tied scores the same rank (dense ranking)", () => {
    const { results } = computeResults(rubric, [
      { teamId: "x", judges: [{ judgeId: "j1", scores: { execution: 8, impact: 8 } }] },
      { teamId: "y", judges: [{ judgeId: "j1", scores: { execution: 8, impact: 8 } }] },
      { teamId: "z", judges: [{ judgeId: "j1", scores: { execution: 6, impact: 6 } }] },
    ]);
    expect(results.map((r) => r.rank)).toEqual([1, 1, 2]);
  });

  it("excludes teams with no scores and treats missing criteria as zero", () => {
    const { results } = computeResults(rubric, [
      { teamId: "scored", judges: [{ judgeId: "j1", scores: { execution: 10 } }] }, // impact missing → 60
      { teamId: "unjudged", judges: [] },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].weightedScore).toBe(60);
  });
});

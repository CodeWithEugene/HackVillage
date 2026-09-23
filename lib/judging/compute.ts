import { z } from "zod";

/**
 * Judging domain — pure functions (Phase 4). The server enforces everything
 * here; the UI merely mirrors it (plan §6.5, §7.6, Decision D4).
 */

export interface Criterion {
  id: string;
  label: string;
  /** Weight, out of 100 total (normalized at compute time). */
  weight: number;
}

export const FEEDBACK_KINDS = ["STRENGTH", "IMPROVEMENT", "NEXT_STEP"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

/** Platform rubric template (Decision D4) — organizers tune labels/weights. */
export const DEFAULT_RUBRIC: Criterion[] = [
  { id: "innovation", label: "Innovation", weight: 25 },
  { id: "execution", label: "Execution & completeness", weight: 25 },
  { id: "impact", label: "Impact on the problem", weight: 20 },
  { id: "presentation", label: "Presentation & demo", weight: 15 },
  { id: "quality", label: "Code quality & repo", weight: 15 },
];

const criterionSchema = z.object({
  id: z.string().trim().min(2).max(40),
  label: z.string().trim().min(2).max(60),
  weight: z.coerce.number().int().min(1).max(100),
});

export const rubricSchema = z
  .array(criterionSchema)
  .min(3, "Rubrics need at least 3 criteria.")
  .max(8, "Rubrics hold at most 8 criteria.")
  .refine((criteria) => new Set(criteria.map((c) => c.id)).size === criteria.length, {
    message: "Criterion ids must be unique.",
  });

export function validateRubric(criteria: Criterion[]): string | null {
  const parsed = rubricSchema.safeParse(criteria);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Check the rubric and try again.";
  }
  const total = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (total !== 100) {
    return `Criterion weights add up to ${total} — they must total 100.`;
  }
  return null;
}

/**
 * The structured-feedback gate (plan §7.6): at least one point of EACH kind
 * — a strength, an improvement, and a next step — before scores can finalize.
 */
export function feedbackGateSatisfied(points: { kind: FeedbackKind }[]): boolean {
  const kinds = new Set(points.map((point) => point.kind));
  return FEEDBACK_KINDS.every((kind) => kinds.has(kind));
}

export interface JudgeScores {
  judgeId: string;
  scores: Record<string, number>; // criterionId -> 0..10
}

export interface TeamResult {
  teamId: string;
  /** Weighted average 0–100, rounded to 2 decimals. */
  weightedScore: number;
  judgeCount: number;
  rank: number;
}

export interface RankedResults {
  results: TeamResult[];
  allJudgesFinalized: boolean;
}

/**
 * Weighted results computation (plan §17 Phase 4 exit criterion):
 * per judge, score = Σ(value × weight) / Σweights; team score = mean across
 * judges. Ties share a rank. Teams with zero judge scores are excluded.
 */
export function computeResults(
  rubric: Criterion[],
  perTeam: { teamId: string; judges: JudgeScores[] }[]
): RankedResults {
  const totalWeight = rubric.reduce((sum, criterion) => sum + criterion.weight, 0);
  const scored = perTeam
    .filter((team) => team.judges.length > 0)
    .map((team) => {
      const judgeScores = team.judges.map((judge) => {
        const earned = rubric.reduce(
          (sum, criterion) => sum + (judge.scores[criterion.id] ?? 0) * criterion.weight,
          0
        );
        return (earned / totalWeight) * 10; // 0–100 scale
      });
      const weightedScore =
        Math.round((judgeScores.reduce((a, b) => a + b, 0) / judgeScores.length) * 100) / 100;
      return { teamId: team.teamId, weightedScore, judgeCount: judgeScores.length, rank: 0 };
    })
    .sort((a, b) => b.weightedScore - a.weightedScore);

  // Dense ranking: ties share a rank, next distinct score takes the next rank.
  let currentRank = 0;
  let previousScore = Number.NaN;
  for (const result of scored) {
    if (result.weightedScore !== previousScore) {
      currentRank += 1;
      previousScore = result.weightedScore;
    }
    result.rank = currentRank;
  }

  return { results: scored, allJudgesFinalized: scored.every((t) => t.judgeCount > 0) };
}

/** Score values are integers 0–10. */
export const scoreValueSchema = z.coerce.number().int().min(0).max(10);

export const feedbackPointSchema = z
  .string()
  .trim()
  .min(10, "Feedback points need at least 10 characters — make them actionable.")
  .max(600);

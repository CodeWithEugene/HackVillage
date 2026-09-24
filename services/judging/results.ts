import { prisma } from "@/lib/db";
import {
  computeResults,
  type Criterion,
  type JudgeScores,
  type RankedResults,
} from "@/lib/judging/compute";

/**
 * Judging service — results computation (server side). Loads the rubric,
 * scores, and finalized state, then delegates to the pure compute function.
 * A team counts in the standings only from FINALIZED judge reviews — a
 * half-entered review must never leak into results.
 */
export async function computeEventResults(eventId: string): Promise<RankedResults | null> {
  const rubric = await prisma.rubric.findUnique({ where: { eventId } });
  if (!rubric) return null;
  const criteria = (rubric.criteria as unknown as Criterion[]) ?? [];

  const [teams, scores, progress] = await Promise.all([
    prisma.team.findMany({
      where: { eventId, status: { not: "DISBANDED" }, submission: { isNot: null } },
      select: { id: true },
    }),
    prisma.score.findMany({
      where: { team: { eventId } },
      select: { judgeId: true, teamId: true, criterionId: true, value: true },
    }),
    prisma.judgingProgress.findMany({
      where: { team: { eventId }, finalizedAt: { not: null } },
      select: { judgeId: true, teamId: true },
    }),
  ]);

  const finalized = new Set(progress.map((p) => `${p.judgeId}:${p.teamId}`));
  const perTeam = teams.map((team) => {
    const judgesMap = new Map<string, Record<string, number>>();
    for (const score of scores) {
      if (score.teamId !== team.id) continue;
      if (!finalized.has(`${score.judgeId}:${score.teamId}`)) continue;
      const entry = judgesMap.get(score.judgeId) ?? {};
      entry[score.criterionId] = score.value;
      judgesMap.set(score.judgeId, entry);
    }
    return {
      teamId: team.id,
      judges: [...judgesMap.entries()].map(
        ([judgeId, scoresMap]): JudgeScores => ({ judgeId, scores: scoresMap })
      ),
    };
  });

  return computeResults(criteria, perTeam);
}

/** Finalized judge reviews per team — the organizer's readiness picture. */
export async function judgingReadiness(eventId: string): Promise<{
  teamsWithSubmission: number;
  fullyJudgedTeams: number;
  activeJudges: number;
}> {
  const [teams, activeJudges, progress] = await Promise.all([
    prisma.team.findMany({
      where: { eventId, status: { not: "DISBANDED" }, submission: { isNot: null } },
      select: { id: true },
    }),
    prisma.judgeAssignment.findMany({
      where: { eventId, status: "ACTIVE" },
      select: { userId: true },
    }),
    prisma.judgingProgress.findMany({
      where: { team: { eventId }, finalizedAt: { not: null } },
      select: { judgeId: true, teamId: true },
    }),
  ]);

  const finalized = new Set(progress.map((p) => `${p.judgeId}:${p.teamId}`));
  const judges = activeJudges.map((j) => j.userId);
  const fullyJudgedTeams =
    judges.length === 0
      ? 0
      : teams.filter((team) =>
          judges.every((judgeId) => finalized.has(`${judgeId}:${team.id}`))
        ).length;

  return { teamsWithSubmission: teams.length, fullyJudgedTeams, activeJudges: judges.length };
}

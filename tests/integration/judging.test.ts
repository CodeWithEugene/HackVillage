import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/db";
import { DEFAULT_RUBRIC } from "@/lib/judging/compute";
import {
  JudgingError,
  addFeedback,
  finalizeReview,
  inviteJudge,
  openJudging,
  respondToInvite,
  saveRubric,
  saveScores,
} from "@/services/judging/service";
import { computeEventResults } from "@/services/judging/results";

/**
 * Judging integration (Phase 4) — against a live Postgres. The exit
 * criterion under test: a judge CANNOT finalize without the full structured
 * feedback gate, no matter what the client claims (server-enforced).
 */

const TEST_KEY = `judging-int-${Date.now().toString(36)}`;

interface World {
  organizerId: string;
  judgeIds: string[];
  eventId: string;
  teamIds: string[];
}

let world: World | null = null;
let orgId: string | null = null;

async function createUser(label: string, role: "ORGANIZER" | "DEVELOPER") {
  const key = `${TEST_KEY}-${label}`;
  const user = await prisma.user.create({
    data: {
      email: `${key}@hackvillage.test`,
      name: `Judging ${label}`,
      handle: key.slice(-24),
      emailVerified: new Date(),
      primaryRole: role,
      onboardingCompletedAt: new Date(),
    },
  });
  await prisma.roleGrant.create({ data: { userId: user.id, role } });
  return user;
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");

  const organizer = await createUser("organizer", "ORGANIZER");
  const org = await prisma.organization.create({
    data: {
      name: `Judging Org ${TEST_KEY}`,
      slug: TEST_KEY,
      ownerId: organizer.id,
      kycStatus: "VERIFIED",
    },
  });
  orgId = org.id;
  await prisma.orgMember.create({
    data: { orgId: org.id, userId: organizer.id, role: "OWNER", status: "ACTIVE" },
  });

  const judges = [await createUser("judge1", "DEVELOPER"), await createUser("judge2", "DEVELOPER")];
  const devs = [await createUser("dev1", "DEVELOPER"), await createUser("dev2", "DEVELOPER")];

  const event = await prisma.event.create({
    data: {
      orgId: org.id,
      slug: `evt-${TEST_KEY}`,
      title: "Judging Integration Event",
      venueType: "ONLINE",
      startsAt: new Date(Date.now() - 48 * 3600 * 1000),
      endsAt: new Date(Date.now() - 24 * 3600 * 1000), // already ended
      registrationDeadline: new Date(Date.now() - 72 * 3600 * 1000),
      problemStatement: "Judging integration event.",
      status: "LIVE",
      prizeVerifiedAt: new Date(),
      publishedAt: new Date(Date.now() - 96 * 3600 * 1000),
    },
  });
  await prisma.prizeBreakdown.create({
    data: { eventId: event.id, place: 1, label: "1st place", amountKes: 100_000 },
  });

  const teamIds: string[] = [];
  for (const [index, leader] of devs.entries()) {
    const team = await prisma.team.create({
      data: {
        eventId: event.id,
        name: `Team ${index + 1}`,
        leaderId: leader.id,
        inviteCode: randomBytes(5).toString("hex"),
      },
    });
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: leader.id, status: "JOINED" },
    });
    await prisma.submission.create({
      data: {
        teamId: team.id,
        repoUrl: `https://github.com/test/repo-${index}`,
        description: `Integration submission ${index + 1} — long enough description.`,
        splitDeclaration: [{ userId: leader.id, percent: 100 }],
      },
    });
    teamIds.push(team.id);
  }

  world = { organizerId: organizer.id, judgeIds: judges.map((j) => j.id), eventId: event.id, teamIds };
});

afterAll(async () => {
  if (orgId) {
    await prisma.organization.delete({ where: { id: orgId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: { contains: TEST_KEY } } });
  }
  await prisma.$disconnect();
});

describe("judging flow (integration)", () => {
  it("rejects non-organizers from inviting judges", async () => {
    const w = world!;
    await expect(inviteJudge(w.eventId, w.judgeIds[0], "somebody")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("invites judges, who accept and become ACTIVE", async () => {
    const w = world!;
    for (const [index, judge] of w.judgeIds.entries()) {
      await inviteJudge(w.eventId, w.organizerId, `judging-${TEST_KEY.slice(-20)}-judge${index + 1}`.slice(-24));
    }
    const assignments = await prisma.judgeAssignment.findMany({
      where: { eventId: w.eventId },
    });
    expect(assignments).toHaveLength(2);
    expect(assignments.every((a) => a.status === "INVITED")).toBe(true);

    for (const assignment of assignments) {
      await respondToInvite(assignment.id, assignment.userId, true);
    }
    const active = await prisma.judgeAssignment.count({
      where: { eventId: w.eventId, status: "ACTIVE" },
    });
    expect(active).toBe(2);
  });

  it("saves a tuned rubric and locks it when judging opens", async () => {
    const w = world!;
    await saveRubric(
      w.eventId,
      w.organizerId,
      DEFAULT_RUBRIC.map((c) => ({ ...c }))
    );
    await openJudging(w.eventId, w.organizerId);

    const event = await prisma.event.findUnique({ where: { id: w.eventId } });
    expect(event?.status).toBe("JUDGING");

    await expect(
      saveRubric(w.eventId, w.organizerId, DEFAULT_RUBRIC)
    ).rejects.toMatchObject({ code: "WRONG_STATE" });
  });

  it("rejects scoring by non-judges (forged identity)", async () => {
    const w = world!;
    const outsider = await createUser("outsider", "DEVELOPER");
    await expect(
      saveScores(w.teamIds[0], outsider.id, [{ criterionId: "innovation", value: 10 }])
    ).rejects.toMatchObject({ code: "NOT_ACTIVE_JUDGE" });
  });

  it("THE GATE: finalization is impossible without the full feedback set — even with all scores", async () => {
    const w = world!;
    const judge = w.judgeIds[0];
    const team = w.teamIds[0];

    // All criteria scored…
    await saveScores(
      team,
      judge,
      DEFAULT_RUBRIC.map((c) => ({ criterionId: c.id, value: 8 }))
    );

    // …but no feedback → rejected.
    await expect(finalizeReview(team, judge)).rejects.toMatchObject({ code: "GATE_UNMET" });

    // Partial feedback (two kinds) → still rejected.
    await addFeedback(team, judge, "STRENGTH", "Offline-first approach was excellent throughout.");
    await addFeedback(team, judge, "IMPROVEMENT", "The USSD fallback needs error handling for retries.");
    await expect(finalizeReview(team, judge)).rejects.toMatchObject({ code: "GATE_UNMET" });

    // Complete feedback → finalize succeeds.
    await addFeedback(team, judge, "NEXT_STEP", "Add a pilot with one matatu crew before scaling.");
    await expect(finalizeReview(team, judge)).resolves.toBeUndefined();

    const progress = await prisma.judgingProgress.findUnique({
      where: { judgeId_teamId: { judgeId: judge, teamId: team } },
    });
    expect(progress?.finalizedAt).not.toBeNull();
  });

  it("finalization requires every criterion scored", async () => {
    const w = world!;
    const judge = w.judgeIds[1];
    const team = w.teamIds[0];

    // Only one criterion scored + full feedback → SCORES_INCOMPLETE.
    await saveScores(team, judge, [{ criterionId: "innovation", value: 9 }]);
    await addFeedback(team, judge, "STRENGTH", "Really strong data model choices overall here.");
    await addFeedback(team, judge, "IMPROVEMENT", "Tests are missing — start with the payment path.");
    await addFeedback(team, judge, "NEXT_STEP", "Ship the receipts QR as a PWA next sprint.");
    await expect(finalizeReview(team, judge)).rejects.toMatchObject({ code: "SCORES_INCOMPLETE" });

    // Complete the scores → finalizes.
    await saveScores(
      team,
      judge,
      DEFAULT_RUBRIC.map((c) => ({ criterionId: c.id, value: 6 }))
    );
    await expect(finalizeReview(team, judge)).resolves.toBeUndefined();
  });

  it("finalized reviews lock scores and feedback", async () => {
    const w = world!;
    const judge = w.judgeIds[0];
    const team = w.teamIds[0];

    await expect(
      saveScores(team, judge, [{ criterionId: "innovation", value: 1 }])
    ).rejects.toMatchObject({ code: "ALREADY_FINALIZED" });
    await expect(
      addFeedback(team, judge, "STRENGTH", "Trying to edit after finalization should fail.")
    ).rejects.toMatchObject({ code: "ALREADY_FINALIZED" });
    await expect(finalizeReview(team, judge)).rejects.toMatchObject({ code: "ALREADY_FINALIZED" });
  });

  it("results count only finalized reviews, weighted correctly", async () => {
    const w = world!;

    // Judge 2 reviews team 2 (finalized); judge 1 has not.
    const judge2 = w.judgeIds[1];
    const team2 = w.teamIds[1];
    await saveScores(
      team2,
      judge2,
      DEFAULT_RUBRIC.map((c) => ({ criterionId: c.id, value: 10 }))
    );
    await addFeedback(team2, judge2, "STRENGTH", "Complete offline demo with real receipts shown.");
    await addFeedback(team2, judge2, "IMPROVEMENT", "Add retry queues for the M-Pesa callbacks.");
    await addFeedback(team2, judge2, "NEXT_STEP", "Pilot with a sacco for two weeks of data.");
    await expect(finalizeReview(team2, judge2)).resolves.toBeUndefined();

    // Team 2: judge2 all-10s → 100. Team 1: two finalized judges (8s, 6s) → 70.
    const results = await computeEventResults(w.eventId);
    expect(results).not.toBeNull();
    const ranked = results!.results.sort((a, b) => a.weightedScore - b.weightedScore);
    const team1 = ranked.find((r) => r.teamId === w.teamIds[0]);
    const team2Result = ranked.find((r) => r.teamId === w.teamIds[1]);
    expect(team1?.weightedScore).toBe(70); // mean(80, 60)
    expect(team1?.judgeCount).toBe(2);
    expect(team2Result?.weightedScore).toBe(100);
    expect(team2Result?.judgeCount).toBe(1);

    // An un-finalized review never leaks into results.
    await saveScores(
      w.teamIds[1],
      w.judgeIds[0],
      DEFAULT_RUBRIC.map((c) => ({ criterionId: c.id, value: 0 }))
    );
    const afterLeak = await computeEventResults(w.eventId);
    const team2After = afterLeak!.results.find((r) => r.teamId === w.teamIds[1]);
    expect(team2After?.judgeCount).toBe(1); // still only the finalized review
    expect(team2After?.weightedScore).toBe(100);
  });
});

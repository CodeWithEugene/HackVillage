import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { DEFAULT_RUBRIC } from "@/lib/judging/compute";
import {
  PowError,
  becomeHiringPartner,
  computePowMetrics,
  createEndorsement,
  materializePortfolioForWinner,
  requestIntroduction,
  respondToIntroduction,
} from "@/services/pow/service";

/**
 * Proof-of-Work & Career integration (Phase 6): metrics derive from verified
 * events only, endorsements are judge+winner gated, introductions anchor on
 * wins, and portfolio materialization is idempotent.
 */

const TEST_KEY = `pow-int-${Date.now().toString(36)}`;
let orgId: string | null = null;

let world: {
  eventId: string;
  judgeId: string;
  winnerId: string; // winner row id
  winnerUserId: string;
  otherUserId: string;
  partnerId: string;
};

async function createUser(label: string) {
  const key = `${TEST_KEY}-${label}`;
  const user = await prisma.user.create({
    data: {
      email: `${key}@hackvillage.test`,
      name: `PoW ${label}`,
      handle: key.slice(-24),
      emailVerified: new Date(),
      primaryRole: "DEVELOPER",
      onboardingCompletedAt: new Date(),
    },
  });
  return user;
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");

  const organizer = await createUser("organizer");
  const judge = await createUser("judge");
  const winnerUser = await createUser("winner");
  const other = await createUser("other");
  const partner = await createUser("partner");

  const org = await prisma.organization.create({
    data: {
      name: `PoW Org ${TEST_KEY}`,
      slug: TEST_KEY,
      ownerId: organizer.id,
      kycStatus: "VERIFIED",
    },
  });
  orgId = org.id;
  await prisma.orgMember.create({
    data: { orgId: org.id, userId: organizer.id, role: "OWNER", status: "ACTIVE" },
  });

  const event = await prisma.event.create({
    data: {
      orgId: org.id,
      slug: `evt-${TEST_KEY}`,
      title: "PoW Integration Event",
      venueType: "ONLINE",
      startsAt: new Date(Date.now() - 48 * 3600 * 1000),
      endsAt: new Date(Date.now() - 24 * 3600 * 1000),
      registrationDeadline: new Date(Date.now() - 72 * 3600 * 1000),
      problemStatement: "PoW integration event.",
      status: "SETTLED",
      prizeVerifiedAt: new Date(),
      publishedAt: new Date(Date.now() - 96 * 3600 * 1000),
    },
  });
  await prisma.prizeBreakdown.create({
    data: { eventId: event.id, place: 1, label: "1st place", amountKes: 100_000, milestoneRequired: false },
  });

  await prisma.judgeAssignment.create({
    data: { eventId: event.id, userId: judge.id, status: "ACTIVE" },
  });
  await prisma.rubric.create({
    data: { eventId: event.id, criteria: DEFAULT_RUBRIC as unknown as object },
  });

  const team = await prisma.team.create({
    data: {
      eventId: event.id,
      name: "PoW Team",
      leaderId: winnerUser.id,
      inviteCode: `pw${Math.random().toString(36).slice(2, 8)}`,
    },
  });
  await prisma.teamMember.create({
    data: { teamId: team.id, userId: winnerUser.id, status: "JOINED" },
  });
  await prisma.registration.create({
    data: { eventId: event.id, userId: winnerUser.id, status: "REGISTERED" },
  });
  await prisma.registration.create({
    data: { eventId: event.id, userId: other.id, status: "REGISTERED" },
  });
  await prisma.submission.create({
    data: {
      teamId: team.id,
      repoUrl: "https://github.com/test/pow-repo",
      description: "The winning PoW submission — a solid offline-first build with receipts.",
      splitDeclaration: [{ userId: winnerUser.id, percent: 100 }],
    },
  });

  const winnerRow = await prisma.winner.create({
    data: {
      eventId: event.id,
      teamId: team.id,
      place: 1,
      userId: winnerUser.id,
      amountKes: 100_000,
      milestoneRequired: false,
    },
  });

  world = {
    eventId: event.id,
    judgeId: judge.id,
    winnerId: winnerRow.id,
    winnerUserId: winnerUser.id,
    otherUserId: other.id,
    partnerId: partner.id,
  };
});

afterAll(async () => {
  if (orgId) {
    await prisma.organization.delete({ where: { id: orgId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: { contains: TEST_KEY } } });
  }
  await prisma.$disconnect();
});

describe("proof of work (integration)", () => {
  it("materializes the winning submission as a portfolio item — idempotently", async () => {
    const first = await materializePortfolioForWinner(world.winnerId);
    expect(first).toBe(1);
    const second = await materializePortfolioForWinner(world.winnerId);
    expect(second).toBe(0); // no duplicate

    const items = await prisma.portfolioItem.findMany({
      where: { developerId: world.winnerUserId },
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      repoUrl: "https://github.com/test/pow-repo",
      lifecycle: "DEMO",
    });
  });

  it("computes verified metrics: participation, win rate, earnings", async () => {
    const metrics = await computePowMetrics(world.winnerUserId);
    expect(metrics).toMatchObject({
      eventsParticipated: 1,
      wins: 1,
      winRate: 100,
      totalWonKes: 100_000,
      portfolioCount: 1,
    });

    const loserMetrics = await computePowMetrics(world.otherUserId);
    expect(loserMetrics.wins).toBe(0);
    expect(loserMetrics.winRate).toBe(0);
    expect(loserMetrics.totalWonKes).toBe(0);
  });

  it("endorsements: only the event's judges, only verified winners", async () => {
    // Non-judge cannot endorse.
    await expect(
      createEndorsement({
        judgeId: world.otherUserId,
        developerId: world.winnerUserId,
        eventId: world.eventId,
        quote: "Not a judge, should not be able to endorse.",
      })
    ).rejects.toMatchObject({ code: "NOT_A_JUDGE" });

    // Judge cannot endorse a non-winner.
    await expect(
      createEndorsement({
        judgeId: world.judgeId,
        developerId: world.otherUserId,
        eventId: world.eventId,
        quote: "Great developer, but they didn't win here.",
      })
    ).rejects.toMatchObject({ code: "NOT_A_WINNER" });

    // The judge endorses the winner.
    await createEndorsement({
      judgeId: world.judgeId,
      developerId: world.winnerUserId,
      eventId: world.eventId,
      quote: "Shipped a complete offline-first product in 48 hours — hire this person.",
    });

    // Duplicate endorsement impossible.
    await expect(
      createEndorsement({
        judgeId: world.judgeId,
        developerId: world.winnerUserId,
        eventId: world.eventId,
        quote: "Saying it twice should fail cleanly.",
      })
    ).rejects.toMatchObject({ code: "ALREADY_EXISTS" });

    const metrics = await computePowMetrics(world.winnerUserId);
    expect(metrics.endorsementCount).toBe(1);
  });

  it("introductions: partners only, winners only, one per event", async () => {
    // Non-partner cannot request.
    await expect(
      requestIntroduction({
        partnerId: world.otherUserId,
        developerId: world.winnerUserId,
        eventId: world.eventId,
        message: "We'd love to talk — but I'm not a partner yet.",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await becomeHiringPartner(world.partnerId, "Acme Fintech");

    // Non-winner cannot be requested.
    await expect(
      requestIntroduction({
        partnerId: world.partnerId,
        developerId: world.otherUserId,
        eventId: world.eventId,
        message: "Requesting an intro to someone who didn't win.",
      })
    ).rejects.toMatchObject({ code: "NOT_A_WINNER" });

    // Legit request.
    await requestIntroduction({
      partnerId: world.partnerId,
      developerId: world.winnerUserId,
      eventId: world.eventId,
      message: "Senior frontend role on our fintech team — your offline-first win fits perfectly.",
    });

    // Duplicate impossible.
    await expect(
      requestIntroduction({
        partnerId: world.partnerId,
        developerId: world.winnerUserId,
        eventId: world.eventId,
        message: "Asking again should fail.",
      })
    ).rejects.toMatchObject({ code: "ALREADY_EXISTS" });
  });

  it("intro responses: accept exchanges contacts, then locks", async () => {
    const intro = await prisma.introduction.findFirst({
      where: { developerId: world.winnerUserId, status: "REQUESTED" },
    });
    expect(intro).not.toBeNull();

    // Wrong developer cannot respond.
    await expect(respondToIntroduction(intro!.id, world.otherUserId, true)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    // Accept.
    await respondToIntroduction(intro!.id, world.winnerUserId, true);
    const accepted = await prisma.introduction.findUnique({ where: { id: intro!.id } });
    expect(accepted?.status).toBe("ACCEPTED");
    expect(accepted?.respondedAt).not.toBeNull();

    // Already handled.
    await expect(respondToIntroduction(intro!.id, world.winnerUserId, false)).rejects.toMatchObject({
      code: "WRONG_STATE",
    });
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import {
  LegacyError,
  openMilestoneDispute,
  recordLegacyOutcome,
  resolveDispute,
  runLegacySweep,
  runMilestoneReminders,
  scheduleLegacyCheckins,
  LEGACY_CHECKIN_DELAY_MS,
} from "@/services/legacy/service";

/**
 * Legacy & disputes integration (Phase 8): check-in scheduling + outcome →
 * portfolio lifecycle, reminder escalation to UNRESPONSIVE, milestone
 * dispute gating, and admin release through the real payout path.
 */

const TEST_KEY = `legacy-int-${Date.now().toString(36)}`;
let orgId: string | null = null;
let adminId: string | null = null;

let world: {
  eventId: string;
  organizerId: string;
  winnerId: string;
  winnerUserId: string;
  outsiderId: string;
  submissionId: string;
};

async function createUser(label: string, asAdmin = false) {
  const key = `${TEST_KEY}-${label}`;
  const user = await prisma.user.create({
    data: {
      email: `${key}@hackvillage.test`,
      name: `Legacy ${label}`,
      handle: key.slice(-24),
      emailVerified: new Date(),
      primaryRole: "DEVELOPER",
      onboardingCompletedAt: new Date(),
    },
  });
  if (asAdmin) await prisma.roleGrant.create({ data: { userId: user.id, role: "ADMIN" } });
  return user;
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");

  const organizer = await createUser("organizer");
  const winnerUser = await createUser("winner");
  const outsider = await createUser("outsider");
  const admin = await createUser("admin", true);
  adminId = admin.id;

  const org = await prisma.organization.create({
    data: {
      name: `Legacy Org ${TEST_KEY}`,
      slug: TEST_KEY,
      ownerId: organizer.id,
      kycStatus: "VERIFIED",
    },
  });
  orgId = org.id;
  await prisma.orgMember.create({
    data: { orgId: org.id, userId: organizer.id, role: "OWNER", status: "ACTIVE" },
  });

  const endsAt = new Date(Date.now() - 96 * 3600 * 1000);
  const event = await prisma.event.create({
    data: {
      orgId: org.id,
      slug: `evt-${TEST_KEY}`,
      title: "Legacy Integration Event",
      venueType: "ONLINE",
      startsAt: new Date(endsAt.getTime() - 48 * 3600 * 1000),
      endsAt,
      registrationDeadline: new Date(endsAt.getTime() - 120 * 3600 * 1000),
      problemStatement: "Legacy integration event.",
      status: "WINNERS_ANNOUNCED",
      prizeVerifiedAt: new Date(),
      publishedAt: new Date(endsAt.getTime() - 144 * 3600 * 1000),
    },
  });
  await prisma.prizeBreakdown.create({
    data: { eventId: event.id, place: 1, label: "1st place", amountKes: 100_000, milestoneRequired: true },
  });

  const team = await prisma.team.create({
    data: {
      eventId: event.id,
      name: "Legacy Team",
      leaderId: winnerUser.id,
      inviteCode: `lg${Math.random().toString(36).slice(2, 8)}`,
    },
  });
  await prisma.teamMember.create({
    data: { teamId: team.id, userId: winnerUser.id, status: "JOINED" },
  });
  const submission = await prisma.submission.create({
    data: {
      teamId: team.id,
      repoUrl: "https://github.com/test/legacy-repo",
      description: "The winning legacy submission — offline-first with receipts.",
      splitDeclaration: [{ userId: winnerUser.id, percent: 100 }],
    },
  });

  const winner = await prisma.winner.create({
    data: {
      eventId: event.id,
      teamId: team.id,
      place: 1,
      userId: winnerUser.id,
      amountKes: 100_000,
      milestoneRequired: true,
      announcedAt: new Date(Date.now() - 20 * 24 * 3600 * 1000), // 20 days ago
    },
  });
  await prisma.milestone.create({
    data: {
      winnerId: winner.id,
      title: "Milestone handover — 1st place",
      dueAt: new Date(Date.now() - 10 * 24 * 3600 * 1000), // 10 days overdue
    },
  });
  await prisma.payout.create({
    data: {
      winnerId: winner.id,
      tranche: "INSTANT",
      amountKes: 50_000,
      idempotencyKey: `${winner.id}:INSTANT`,
      recipientCode: "RCP_SIM_LEGACY",
      status: "SUCCEEDED",
      paidAt: new Date(),
    },
  });
  await prisma.developerProfile.upsert({
    where: { userId: winnerUser.id },
    create: { userId: winnerUser.id, payoutRecipientCode: "RCP_SIM_LEGACY", payoutMethod: "MPESA" },
    update: {},
  });
  await prisma.portfolioItem.create({
    data: {
      submissionId: submission.id,
      developerId: winnerUser.id,
      title: "Legacy Team — winning submission",
      summary: "The winning legacy submission.",
      repoUrl: submission.repoUrl,
      lifecycle: "DEMO",
    },
  });

  world = {
    eventId: event.id,
    organizerId: organizer.id,
    winnerId: winner.id,
    winnerUserId: winnerUser.id,
    outsiderId: outsider.id,
    submissionId: submission.id,
  };
});

afterAll(async () => {
  if (orgId) {
    await prisma.organization.delete({ where: { id: orgId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: { contains: TEST_KEY } } });
  }
  await prisma.$disconnect();
});

describe("legacy tracker (integration)", () => {
  it("schedules check-ins for every submission of the event — idempotently", async () => {
    const first = await scheduleLegacyCheckins(world.eventId);
    expect(first).toBe(1);
    const second = await scheduleLegacyCheckins(world.eventId);
    expect(second).toBe(0);

    const checkin = await prisma.legacyCheckin.findUnique({
      where: { submissionId: world.submissionId },
    });
    expect(checkin).not.toBeNull();
    expect(checkin!.dueAt.getTime()).toBeGreaterThan(
      Date.now() + LEGACY_CHECKIN_DELAY_MS - 60_000
    );
  });

  it("reminders escalate: nudge at due, mark UNRESPONSIVE after 28 days", async () => {
    // Backdate the check-in so it's due, with the first reminder already sent.
    await prisma.legacyCheckin.update({
      where: { submissionId: world.submissionId },
      data: { dueAt: new Date(Date.now() - 29 * 24 * 3600 * 1000), reminderCount: 1 },
    });

    const result = await runLegacySweep();
    expect(result.reminded + result.unresponsive).toBeGreaterThanOrEqual(1);

    // The winner got the reminder notification.
    const notification = await prisma.notification.findFirst({
      where: { userId: world.winnerUserId, type: "legacy.checkin" },
    });
    expect(notification).not.toBeNull();

    // 29 days overdue with reminders exhausted → UNRESPONSIVE.
    const checkin = await prisma.legacyCheckin.findUnique({
      where: { submissionId: world.submissionId },
    });
    expect(checkin?.outcome).toBe("UNRESPONSIVE");
    expect(checkin?.completedAt).not.toBeNull();
  });

  it("recording an outcome updates the portfolio lifecycle", async () => {
    // A team member records IN_PRODUCTION.
    await recordLegacyOutcome({
      submissionId: world.submissionId,
      userId: world.winnerUserId,
      outcome: "IN_PRODUCTION",
      notes: "It's live with 200 users.",
    });

    const [checkin, portfolio] = await Promise.all([
      prisma.legacyCheckin.findUnique({ where: { submissionId: world.submissionId } }),
      prisma.portfolioItem.findUnique({ where: { submissionId: world.submissionId } }),
    ]);
    expect(checkin?.outcome).toBe("IN_PRODUCTION");
    expect(portfolio?.lifecycle).toBe("IN_PRODUCTION");
  });

  it("outsiders cannot record outcomes for someone else's team", async () => {
    await expect(
      recordLegacyOutcome({
        submissionId: world.submissionId,
        userId: world.outsiderId,
        outcome: "ABANDONED",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("milestone reminders nudge the organizer when overdue", async () => {
    const reminded = await runMilestoneReminders();
    expect(reminded).toBeGreaterThanOrEqual(1);
    const notification = await prisma.notification.findFirst({
      where: { userId: world.organizerId, type: "milestone.reminder" },
    });
    expect(notification).not.toBeNull();
  });
});

describe("milestone disputes (integration)", () => {
  it("gates: only the winner, only unconfirmed milestones, no duplicates", async () => {
    await expect(
      openMilestoneDispute({
        winnerId: world.winnerId,
        userId: world.outsiderId,
        claim: "Outsider trying to dispute someone else's milestone.",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await openMilestoneDispute({
      winnerId: world.winnerId,
      userId: world.winnerUserId,
      claim: "We delivered the full handover 15 days ago; the organizer stopped responding.",
      evidenceUrl: "https://github.com/test/legacy-repo/releases",
    });

    await expect(
      openMilestoneDispute({
        winnerId: world.winnerId,
        userId: world.winnerUserId,
        claim: "Opening the same dispute twice should fail.",
      })
    ).rejects.toMatchObject({ code: "WRONG_STATE" });
  });

  it("admin resolution: non-admins rejected; release queues the milestone payout", async () => {
    await expect(
      resolveDispute({
        disputeId: (await prisma.dispute.findUnique({ where: { winnerId: world.winnerId } }))!.id,
        adminId: world.outsiderId,
        resolution: "REJECT",
        note: "Not an admin, should fail.",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const dispute = await prisma.dispute.findUnique({ where: { winnerId: world.winnerId } });
    const result = await resolveDispute({
      disputeId: dispute!.id,
      adminId: adminId!,
      resolution: "RELEASE",
      note: "Evidence shows full delivery — releasing the final 50%.",
    });
    expect(result.outcome).toBe("released");

    // The milestone payout was created through the idempotent path.
    const milestonePayout = await prisma.payout.findUnique({
      where: { idempotencyKey: `${world.winnerId}:MILESTONE` },
    });
    expect(milestonePayout).toMatchObject({ tranche: "MILESTONE", amountKes: 50_000, status: "QUEUED" });

    // The dispute and milestone are both resolved.
    const [resolvedDispute, milestone] = await Promise.all([
      prisma.dispute.findUnique({ where: { winnerId: world.winnerId } }),
      prisma.milestone.findUnique({ where: { winnerId: world.winnerId } }),
    ]);
    expect(resolvedDispute?.status).toBe("RESOLVED_RELEASE");
    expect(milestone?.confirmedAt).not.toBeNull();

    // Audit logged.
    const audit = await prisma.auditLog.findFirst({
      where: { action: "dispute.released", entityId: dispute!.id },
    });
    expect(audit?.reason).toContain("releasing the final 50%");
  });

  it("re-resolution is impossible (WRONG_STATE)", async () => {
    const dispute = await prisma.dispute.findUnique({ where: { winnerId: world.winnerId } });
    await expect(
      resolveDispute({
        disputeId: dispute!.id,
        adminId: adminId!,
        resolution: "REJECT",
        note: "Trying to resolve twice.",
      })
    ).rejects.toMatchObject({ code: "WRONG_STATE" });
  });
});

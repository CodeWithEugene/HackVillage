import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { LegacyError, resolveDispute } from "@/services/legacy/service";

/**
 * Dispute REFUND resolution (audit remediation): the 2-admin rule, the
 * milestone-payout precondition, and the vault refund integration.
 */
const TEST_KEY = `disp-int-${Date.now().toString(36)}`;
const userIds: string[] = [];
const orgIds: string[] = [];

async function createUser(label: string, role: "DEVELOPER" | "ORGANIZER" = "DEVELOPER", admin = false) {
  const user = await prisma.user.create({
    data: {
      email: `${TEST_KEY}-${label}@hackvillage.test`,
      name: `Dispute ${label}`,
      handle: `${TEST_KEY}-${label}`.slice(-28),
      emailVerified: new Date(),
      primaryRole: role,
      onboardingCompletedAt: new Date(),
    },
  });
  userIds.push(user.id);
  if (admin) await prisma.roleGrant.create({ data: { userId: user.id, role: "ADMIN" } });
  return user;
}

/** An event at WINNERS_ANNOUNCED with a winner + unconfirmed milestone. */
async function createDisputedWorld(label: string, opts: { withVault?: boolean; withMilestonePayout?: boolean } = {}) {
  const organizer = await createUser(`${label}-org`, "ORGANIZER");
  const winnerUser = await createUser(`${label}-win`);
  const org = await prisma.organization.create({
    data: { name: `Dispute Org ${label}`, slug: `${TEST_KEY}-${label}`, ownerId: organizer.id, kycStatus: "VERIFIED" },
  });
  orgIds.push(org.id);
  await prisma.orgMember.create({ data: { orgId: org.id, userId: organizer.id, role: "OWNER", status: "ACTIVE" } });
  const event = await prisma.event.create({
    data: {
      orgId: org.id,
      slug: `evt-${TEST_KEY}-${label}`,
      title: `Dispute Event ${label}`,
      venueType: "ONLINE",
      startsAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
      endsAt: new Date(Date.now() - 29 * 24 * 3600 * 1000),
      registrationDeadline: new Date(Date.now() - 31 * 24 * 3600 * 1000),
      problemStatement: "Integration test event for dispute refunds.",
      status: "WINNERS_ANNOUNCED",
      publishedAt: new Date(Date.now() - 32 * 24 * 3600 * 1000),
    },
  });
  const team = await prisma.team.create({
    data: {
      eventId: event.id,
      name: `Dispute Team ${label}`,
      leaderId: winnerUser.id,
      inviteCode: `dp${Math.random().toString(36).slice(2, 8)}`,
    },
  });
  await prisma.teamMember.create({ data: { teamId: team.id, userId: winnerUser.id, status: "JOINED" } });
  const winner = await prisma.winner.create({
    data: {
      eventId: event.id,
      teamId: team.id,
      place: 1,
      userId: winnerUser.id,
      amountKes: 100_000,
      milestoneRequired: true,
      announcedAt: new Date(Date.now() - 20 * 24 * 3600 * 1000),
    },
  });
  await prisma.milestone.create({
    data: {
      winnerId: winner.id,
      title: "Handover",
      dueAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    },
  });
  if (opts.withMilestonePayout) {
    await prisma.payout.create({
      data: {
        winnerId: winner.id,
        tranche: "MILESTONE",
        amountKes: 50_000,
        idempotencyKey: `${winner.id}:MILESTONE`,
        recipientCode: "RCP_SIM_TEST",
        status: "SUCCEEDED",
        paidAt: new Date(),
      },
    });
  }
  if (opts.withVault) {
    await prisma.vaultState.create({
      data: { eventId: event.id, amountKes: 100_000, chainState: "LOCKED" },
    });
  }
  const dispute = await prisma.dispute.create({
    data: {
      winnerId: winner.id,
      openedBy: winnerUser.id,
      claim: "The milestone was delivered but never confirmed.",
    },
  });
  return { organizer, winnerUser, org, event, winner, dispute };
}

let admin1 = "";
let admin2 = "";
let plainId = "";

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  admin1 = (await createUser("admin1", "DEVELOPER", true)).id;
  admin2 = (await createUser("admin2", "DEVELOPER", true)).id;
  plainId = (await createUser("plain")).id;
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.roleGrant.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

const NOTE = "Reviewed the evidence; refunding the remaining pool.";

describe("dispute REFUND resolution", () => {
  it("refuses without a second approver, with self-approval, and for non-admins", async () => {
    const w1 = await createDisputedWorld("no2nd");
    await expect(
      resolveDispute({ disputeId: w1.dispute.id, adminId: admin1, resolution: "REFUND", note: NOTE })
    ).rejects.toMatchObject({ message: expect.stringContaining("second admin") });

    const w2 = await createDisputedWorld("self");
    await expect(
      resolveDispute({
        disputeId: w2.dispute.id,
        adminId: admin1,
        resolution: "REFUND",
        note: NOTE,
        secondApproverId: admin1,
      })
    ).rejects.toMatchObject({ message: expect.stringContaining("different admin") });

    const w3 = await createDisputedWorld("notadmin");
    await expect(
      resolveDispute({
        disputeId: w3.dispute.id,
        adminId: plainId,
        resolution: "REFUND",
        note: NOTE,
        secondApproverId: admin1,
      })
    ).rejects.toBeInstanceOf(LegacyError);

    // Second approver must also be an admin.
    const w4 = await createDisputedWorld("bad2nd");
    await expect(
      resolveDispute({
        disputeId: w4.dispute.id,
        adminId: admin1,
        resolution: "REFUND",
        note: NOTE,
        secondApproverId: plainId,
      })
    ).rejects.toMatchObject({ message: expect.stringContaining("isn't an admin") });

    // Nothing was resolved.
    for (const w of [w1, w2, w3, w4]) {
      const stored = await prisma.dispute.findUniqueOrThrow({ where: { id: w.dispute.id } });
      expect(stored.status).toBe("OPEN");
    }
  });

  it("refuses once a MILESTONE payout exists — paid tranches are a manual process", async () => {
    const w = await createDisputedWorld("paid", { withMilestonePayout: true });
    await expect(
      resolveDispute({
        disputeId: w.dispute.id,
        adminId: admin1,
        resolution: "REFUND",
        note: NOTE,
        secondApproverId: admin2,
      })
    ).rejects.toMatchObject({ message: expect.stringContaining("manual ops process") });
    const stored = await prisma.dispute.findUniqueOrThrow({ where: { id: w.dispute.id } });
    expect(stored.status).toBe("OPEN");
  });

  it("happy path: RESOLVED_REFUND + audit trail + the LOCKED vault is refunded", async () => {
    const w = await createDisputedWorld("happy", { withVault: true });

    const result = await resolveDispute({
      disputeId: w.dispute.id,
      adminId: admin1,
      resolution: "REFUND",
      note: NOTE,
      secondApproverId: admin2,
    });
    expect(result.outcome).toBe("refunded");

    const stored = await prisma.dispute.findUniqueOrThrow({ where: { id: w.dispute.id } });
    expect(stored.status).toBe("RESOLVED_REFUND");
    expect(stored.resolvedBy).toBe(admin1);
    expect(stored.secondApproverId).toBe(admin2);
    expect(stored.resolvedAt).not.toBeNull();

    const audit = await prisma.auditLog.findFirst({
      where: { entityId: w.dispute.id, action: "dispute.refunded" },
    });
    expect(audit).not.toBeNull();

    const vault = await prisma.vaultState.findUniqueOrThrow({ where: { eventId: w.event.id } });
    expect(vault.chainState).toBe("REFUNDED");
    expect(vault.refundedAt).not.toBeNull();

    // And a resolved dispute can't be re-resolved.
    await expect(
      resolveDispute({
        disputeId: w.dispute.id,
        adminId: admin1,
        resolution: "RELEASE",
        note: "Trying to flip it after the fact.",
      })
    ).rejects.toMatchObject({ message: expect.stringContaining("already resolved") });
  });

  it("refund without a vault still resolves the dispute (no refund side effects)", async () => {
    const w = await createDisputedWorld("novault");
    const result = await resolveDispute({
      disputeId: w.dispute.id,
      adminId: admin1,
      resolution: "REFUND",
      note: NOTE,
      secondApproverId: admin2,
    });
    expect(result.outcome).toBe("refunded");
    expect((await prisma.dispute.findUniqueOrThrow({ where: { id: w.dispute.id } })).status).toBe(
      "RESOLVED_REFUND"
    );
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { reconcileLedger } from "@/services/escrow/reconcile";

/**
 * Ledger reconciliation integration (Phase 9 — plan §11.3): the three-way
 * match reports (never repairs) mismatches. Built against a live Postgres
 * with a seeded full cycle, plus a manufactured mismatch to prove detection.
 */

const TEST_KEY = `reconcile-int-${Date.now().toString(36)}`;
let orgId: string | null = null;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");

  const organizer = await prisma.user.create({
    data: {
      email: `${TEST_KEY}@hackvillage.test`,
      name: "Reconcile Organizer",
      handle: TEST_KEY.slice(-24),
      emailVerified: new Date(),
      primaryRole: "ORGANIZER",
      onboardingCompletedAt: new Date(),
    },
  });
  const org = await prisma.organization.create({
    data: { name: `Reconcile Org ${TEST_KEY}`, slug: TEST_KEY, ownerId: organizer.id, kycStatus: "VERIFIED" },
  });
  orgId = org.id;
  await prisma.orgMember.create({
    data: { orgId: org.id, userId: organizer.id, role: "OWNER", status: "ACTIVE" },
  });
});

afterAll(async () => {
  if (orgId) {
    await prisma.organization.delete({ where: { id: orgId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: { contains: TEST_KEY } } });
  }
  await prisma.$disconnect();
});

describe("ledger reconciliation (integration)", () => {
  it("detects a LOCKED vault with no deposit entry", async () => {
    const event = await prisma.event.create({
      data: {
        orgId: orgId!,
        slug: `evt-${TEST_KEY}-a`,
        title: "Reconcile Event A",
        venueType: "ONLINE",
        startsAt: new Date(Date.now() + 5 * 24 * 3600 * 1000),
        endsAt: new Date(Date.now() + 6 * 24 * 3600 * 1000),
        registrationDeadline: new Date(Date.now() + 4 * 24 * 3600 * 1000),
        problemStatement: "Reconcile test event A.",
        status: "LIVE",
        prizeVerifiedAt: new Date(),
        publishedAt: new Date(),
      },
    });
    await prisma.vaultState.create({
      data: { eventId: event.id, amountKes: 50_000, chainState: "LOCKED", lockedAt: new Date() },
    });

    const result = await reconcileLedger();
    const finding = result.findings.find((f) => f.eventId === event.id && f.kind === "vault-missing-entry");
    expect(finding).toBeDefined();
    expect(finding?.detail).toContain("no DEPOSIT_LOCKED");
  });

  it("detects a SUCCEEDED payout with no ledger entry", async () => {
    const event = await prisma.event.create({
      data: {
        orgId: orgId!,
        slug: `evt-${TEST_KEY}-b`,
        title: "Reconcile Event B",
        venueType: "ONLINE",
        startsAt: new Date(Date.now() - 48 * 3600 * 1000),
        endsAt: new Date(Date.now() - 24 * 3600 * 1000),
        registrationDeadline: new Date(Date.now() - 72 * 3600 * 1000),
        problemStatement: "Reconcile test event B.",
        status: "WINNERS_ANNOUNCED",
        prizeVerifiedAt: new Date(),
        publishedAt: new Date(),
      },
    });
    const team = await prisma.team.create({
      data: {
        eventId: event.id,
        name: "Reconcile Team",
        leaderId: (await prisma.user.findFirst({ where: { email: { contains: TEST_KEY } } }))!.id,
        inviteCode: `rc${Math.random().toString(36).slice(2, 8)}`,
      },
    });
    const winner = await prisma.winner.create({
      data: {
        eventId: event.id,
        teamId: team.id,
        place: 1,
        userId: (await prisma.user.findFirst({ where: { email: { contains: TEST_KEY } } }))!.id,
        amountKes: 50_000,
        milestoneRequired: false,
      },
    });
    await prisma.payout.create({
      data: {
        winnerId: winner.id,
        tranche: "INSTANT",
        amountKes: 50_000,
        idempotencyKey: `${winner.id}:INSTANT`,
        recipientCode: "RCP_SIM_RECONCILE",
        status: "SUCCEEDED",
        paidAt: new Date(),
      },
    });
    await prisma.vaultState.create({
      data: { eventId: event.id, amountKes: 50_000, chainState: "SETTLED", lockedAt: new Date(), settledAt: new Date() },
    });

    const result = await reconcileLedger();
    const finding = result.findings.find((f) => f.eventId === event.id && f.kind === "payout-missing-entry");
    expect(finding).toBeDefined();
    expect(finding?.detail).toContain("SUCCEEDED with no ledger entry");
  });

  it("a fully consistent event produces no findings", async () => {
    const event = await prisma.event.create({
      data: {
        orgId: orgId!,
        slug: `evt-${TEST_KEY}-c`,
        title: "Reconcile Event C",
        venueType: "ONLINE",
        startsAt: new Date(Date.now() - 48 * 3600 * 1000),
        endsAt: new Date(Date.now() - 24 * 3600 * 1000),
        registrationDeadline: new Date(Date.now() - 72 * 3600 * 1000),
        problemStatement: "Reconcile test event C.",
        status: "WINNERS_ANNOUNCED",
        prizeVerifiedAt: new Date(),
        publishedAt: new Date(),
      },
    });
    const organizerId = (await prisma.user.findFirst({ where: { email: { contains: TEST_KEY } } }))!.id;
    const team = await prisma.team.create({
      data: {
        eventId: event.id,
        name: "Reconcile Team C",
        leaderId: organizerId,
        inviteCode: `rc${Math.random().toString(36).slice(2, 8)}`,
      },
    });
    const winner = await prisma.winner.create({
      data: {
        eventId: event.id,
        teamId: team.id,
        place: 1,
        userId: organizerId,
        amountKes: 50_000,
        milestoneRequired: false,
      },
    });
    await prisma.payout.create({
      data: {
        winnerId: winner.id,
        tranche: "INSTANT",
        amountKes: 50_000,
        idempotencyKey: `${winner.id}:INSTANT`,
        recipientCode: "RCP_SIM_RECONCILE",
        status: "SUCCEEDED",
        paidAt: new Date(),
      },
    });
    await prisma.vaultState.create({
      data: { eventId: event.id, amountKes: 50_000, chainState: "SETTLED", lockedAt: new Date(), settledAt: new Date() },
    });
    // The full consistent trail: vault created + locked + payout entries.
    await prisma.ledgerEntry.createMany({
      data: [
        { eventId: event.id, type: "VAULT_CREATED", payload: { amountKes: 50_000 }, txHash: `0x${"a".repeat(64)}`, blockNumber: 1 },
        { eventId: event.id, type: "DEPOSIT_LOCKED", payload: { amountKes: 50_000 }, txHash: `0x${"b".repeat(64)}`, blockNumber: 2 },
        { eventId: event.id, type: "INSTANT_PAYOUT", payload: { winnerId: winner.id, amountKes: 50_000 }, txHash: `0x${"c".repeat(64)}`, blockNumber: 3 },
      ],
    });

    const result = await reconcileLedger();
    const eventFindings = result.findings.filter((f) => f.eventId === event.id);
    expect(eventFindings).toHaveLength(0);
  });
});

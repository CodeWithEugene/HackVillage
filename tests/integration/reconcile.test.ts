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

  it("does NOT false-flag a REVERSED payout's ledger entry (the entry records a real past transfer)", async () => {
    const event = await prisma.event.create({
      data: {
        orgId: orgId!,
        slug: `evt-${TEST_KEY}-rev`,
        title: "Reconcile Reversed Event",
        venueType: "ONLINE",
        startsAt: new Date(Date.now() - 48 * 3600 * 1000),
        endsAt: new Date(Date.now() - 24 * 3600 * 1000),
        registrationDeadline: new Date(Date.now() - 72 * 3600 * 1000),
        problemStatement: "Reconcile reversed-payout event.",
        status: "WINNERS_ANNOUNCED",
        prizeVerifiedAt: new Date(),
        publishedAt: new Date(),
      },
    });
    const organizerId = (await prisma.user.findFirst({ where: { email: { contains: TEST_KEY } } }))!.id;
    const team = await prisma.team.create({
      data: {
        eventId: event.id,
        name: "Reversed Team",
        leaderId: organizerId,
        inviteCode: `rv${Math.random().toString(36).slice(2, 8)}`,
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
    // Paid, attested, THEN clawed back provider-side.
    await prisma.payout.create({
      data: {
        winnerId: winner.id,
        tranche: "INSTANT",
        amountKes: 50_000,
        idempotencyKey: `${winner.id}:INSTANT`,
        recipientCode: "RCP_SIM_REVERSED",
        status: "REVERSED",
        paidAt: new Date(),
      },
    });
    await prisma.vaultState.create({
      data: { eventId: event.id, amountKes: 50_000, chainState: "SETTLED", lockedAt: new Date(), settledAt: new Date() },
    });
    await prisma.ledgerEntry.createMany({
      data: [
        { eventId: event.id, type: "VAULT_CREATED", payload: { amountKes: 50_000 }, txHash: `0x${"d".repeat(64)}`, blockNumber: 1 },
        { eventId: event.id, type: "DEPOSIT_LOCKED", payload: { amountKes: 50_000 }, txHash: `0x${"e".repeat(64)}`, blockNumber: 2 },
        { eventId: event.id, type: "INSTANT_PAYOUT", payload: { winnerId: winner.id, amountKes: 50_000 }, txHash: `0x${"f".repeat(64)}`, blockNumber: 3 },
      ],
    });

    const result = await reconcileLedger();
    const eventFindings = result.findings.filter((f) => f.eventId === event.id);
    expect(eventFindings).toHaveLength(0); // no extra-ledger-entry false positive
  });

  it("skips the chain leg in simulation mode and says so in the report", async () => {
    const result = await reconcileLedger();
    expect(result.chainLeg).toBe("skipped-simulation");
    expect(result.autoRepairs).toBe(0);
  });

  it("chain leg (amoy): a vault missing on-chain is reported AND auto-repaired via re-enqueue", async () => {
    const startedAt = new Date();
    const event = await prisma.event.create({
      data: {
        orgId: orgId!,
        slug: `evt-${TEST_KEY}-chain`,
        title: "Reconcile Chain Event",
        venueType: "ONLINE",
        startsAt: new Date(Date.now() - 48 * 3600 * 1000),
        endsAt: new Date(Date.now() - 24 * 3600 * 1000),
        registrationDeadline: new Date(Date.now() - 72 * 3600 * 1000),
        problemStatement: "Reconcile chain-leg event.",
        status: "LIVE",
        prizeVerifiedAt: new Date(),
        publishedAt: new Date(),
      },
    });
    await prisma.vaultState.create({
      data: { eventId: event.id, amountKes: 50_000, chainState: "LOCKED", lockedAt: new Date() },
    });
    await prisma.ledgerEntry.create({
      data: { eventId: event.id, type: "DEPOSIT_LOCKED", payload: { amountKes: 50_000 }, txHash: `0x${"0".repeat(64)}`, blockNumber: 9 },
    });

    // A stub amoy-mode chain: no vault on-chain for this event.
    const stubChain: import("@/lib/ports/chain").ChainPort = {
      mode: "amoy",
      createVault: async () => {
        throw new Error("not called");
      },
      attest: async () => {
        throw new Error("not called");
      },
      vaultAddressFor: async () => null,
      readVaultState: async () => null,
    };

    const result = await reconcileLedger(stubChain);
    expect(result.chainLeg).toBe("ran");
    const finding = result.findings.find(
      (f) => f.eventId === event.id && f.kind === "chain-state-mismatch"
    );
    expect(finding).toBeDefined();
    expect(finding?.detail).toContain("no vault exists on-chain");
    expect(result.autoRepairs).toBeGreaterThanOrEqual(1);

    // The repair re-enqueued the vault-creation attestation job.
    const jobs = await prisma.$queryRawUnsafe<{ data: Record<string, unknown> }[]>(
      `SELECT data FROM pgboss.job WHERE name = 'escrow.attest-vault-created' AND data->>'eventId' = $1`,
      event.id
    );
    expect(jobs.length).toBeGreaterThanOrEqual(1);
    // Clean up every repair job this run enqueued (the stub vault-less chain
    // flags other fixtures' vaults too).
    await prisma.$executeRawUnsafe(
      `DELETE FROM pgboss.job WHERE name IN ('escrow.attest-vault-created', 'escrow.attest-vault-locked', 'payout.attest') AND created_on >= $1`,
      startedAt
    ).catch(() => undefined);
  });

  it("chain leg (amoy): on-chain behind DB re-enqueues the missing payout attestations", async () => {
    const startedAt = new Date();
    const event = await prisma.event.create({
      data: {
        orgId: orgId!,
        slug: `evt-${TEST_KEY}-behind`,
        title: "Reconcile Behind Event",
        venueType: "ONLINE",
        startsAt: new Date(Date.now() - 48 * 3600 * 1000),
        endsAt: new Date(Date.now() - 24 * 3600 * 1000),
        registrationDeadline: new Date(Date.now() - 72 * 3600 * 1000),
        problemStatement: "Reconcile chain-behind event.",
        status: "WINNERS_ANNOUNCED",
        prizeVerifiedAt: new Date(),
        publishedAt: new Date(),
      },
    });
    const organizerId = (await prisma.user.findFirst({ where: { email: { contains: TEST_KEY } } }))!.id;
    const team = await prisma.team.create({
      data: {
        eventId: event.id,
        name: "Behind Team",
        leaderId: organizerId,
        inviteCode: `bh${Math.random().toString(36).slice(2, 8)}`,
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
        recipientCode: "RCP_SIM_BEHIND",
        status: "SUCCEEDED",
        paidAt: new Date(),
        paystackReference: `trf-${TEST_KEY}-behind-1`,
      },
    });
    await prisma.vaultState.create({
      data: { eventId: event.id, amountKes: 50_000, chainState: "HALF_RELEASED", lockedAt: new Date(), halfReleasedAt: new Date() },
    });
    await prisma.ledgerEntry.createMany({
      data: [
        { eventId: event.id, type: "VAULT_CREATED", payload: { amountKes: 50_000 }, txHash: `0x${"1".repeat(64)}`, blockNumber: 1 },
        { eventId: event.id, type: "DEPOSIT_LOCKED", payload: { amountKes: 50_000 }, txHash: `0x${"2".repeat(64)}`, blockNumber: 2 },
        { eventId: event.id, type: "INSTANT_PAYOUT", payload: { winnerId: winner.id, amountKes: 50_000 }, txHash: `0x${"3".repeat(64)}`, blockNumber: 3 },
      ],
    });

    // On-chain the vault is only LOCKED — the instant payout attestation never landed.
    const stubChain: import("@/lib/ports/chain").ChainPort = {
      mode: "amoy",
      createVault: async () => {
        throw new Error("not called");
      },
      attest: async () => {
        throw new Error("not called");
      },
      vaultAddressFor: async () => "0xabc",
      readVaultState: async (eventId: string) =>
        eventId === event.id ? { state: "LOCKED", releasedKes: 0 } : null,
    };

    const result = await reconcileLedger(stubChain);
    const findings = result.findings.filter((f) => f.eventId === event.id);
    expect(findings.some((f) => f.kind === "chain-state-mismatch")).toBe(true);
    expect(findings.some((f) => f.kind === "chain-released-mismatch")).toBe(true);
    expect(result.autoRepairs).toBeGreaterThanOrEqual(1);

    const jobs = await prisma.$queryRawUnsafe<{ data: Record<string, unknown> }[]>(
      `SELECT data FROM pgboss.job WHERE name = 'payout.attest' AND data->>'eventId' = $1`,
      event.id
    );
    expect(jobs.length).toBeGreaterThanOrEqual(1);
    expect(jobs[0].data.tranche).toBe("INSTANT");
    await prisma.$executeRawUnsafe(
      `DELETE FROM pgboss.job WHERE name IN ('escrow.attest-vault-created', 'escrow.attest-vault-locked', 'payout.attest') AND created_on >= $1`,
      startedAt
    ).catch(() => undefined);
  });
});

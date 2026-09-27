import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { DepositError, initiateDeposit, recordChargeSuccess, expireStaleDeposits } from "@/services/escrow/deposits";
import { attestVaultCreation, attestVaultLocked } from "@/services/escrow/attestations";
import { processPaystackWebhook } from "@/services/escrow/webhook";

/**
 * Escrow integration tests (CONTRIBUTING: payout failure/rollback paths are
 * the highest-risk code paths). Runs against a real Postgres — locally via
 * .env, in CI via the postgres service container. Every test cleans up after
 * itself via the cascade on the test organization.
 */

const TEST_KEY = `escrow-int-${Date.now().toString(36)}`;
const suiteStartedAt = new Date();

async function createTestWorld(
  label: string,
  kycStatus: "VERIFIED" | "NONE" = "VERIFIED",
  poolKes = 100_000
) {
  const key = `${TEST_KEY}-${label}`;
  const user = await prisma.user.create({
    data: {
      email: `${key}@hackvillage.test`,
      name: "Escrow Test Organizer",
      handle: key.slice(-24),
      emailVerified: new Date(),
      primaryRole: "ORGANIZER",
      onboardingCompletedAt: new Date(),
    },
  });
  const org = await prisma.organization.create({
    data: {
      name: `Escrow Test Org ${key}`,
      slug: key,
      ownerId: user.id,
      kycStatus,
    },
  });
  await prisma.orgMember.create({
    data: { orgId: org.id, userId: user.id, role: "OWNER", status: "ACTIVE" },
  });
  const event = await prisma.event.create({
    data: {
      orgId: org.id,
      slug: `evt-${key}`,
      title: "Escrow Integration Event",
      venueType: "ONLINE",
      startsAt: new Date(Date.now() + 10 * 24 * 3600 * 1000),
      endsAt: new Date(Date.now() + 11 * 24 * 3600 * 1000),
      registrationDeadline: new Date(Date.now() + 9 * 24 * 3600 * 1000),
      problemStatement: "Integration test event for the escrow engine.",
      status: "PENDING_DEPOSIT",
      publishedAt: new Date(),
    },
  });
  await prisma.prizeBreakdown.create({
    data: { eventId: event.id, place: 1, label: "1st place", amountKes: poolKes },
  });
  return { user, org, event };
}

describe("escrow deposit flow (integration)", () => {
  let world: Awaited<ReturnType<typeof createTestWorld>>;
  let cleanupOrgId: string;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
    world = await createTestWorld("main");
    cleanupOrgId = world.org.id;
  });

  afterAll(async () => {
    // Cascade removes org → event → deposits/vault/ledger.
    if (cleanupOrgId) {
      await prisma.organization.delete({ where: { id: cleanupOrgId } }).catch(() => undefined);
      await prisma.user.deleteMany({ where: { email: { contains: TEST_KEY } } });
    }
    // Drop pg-boss jobs enqueued by this suite (attest/refund/announce) — the
    // test process registers no workers, so they'd otherwise linger.
    await prisma
      .$executeRawUnsafe(
        `DELETE FROM pgboss.job WHERE name IN ('escrow.attest-vault-created', 'escrow.attest-vault-locked', 'escrow.attest-refund', 'hackathon.announce') AND created_on >= $1`,
        suiteStartedAt
      )
      .catch(() => undefined);
    await prisma.$disconnect();
  });

  it("rejects funding before KYB verification (CBK gate)", async () => {
    const unverified = await createTestWorld("nokyb", "NONE");
    try {
      await expect(initiateDeposit(unverified.event.id, unverified.user.id)).rejects.toMatchObject(
        { code: "KYB_REQUIRED" }
      );
    } finally {
      await prisma.organization.delete({ where: { id: unverified.org.id } });
    }
  });

  it("initiates a deposit for the remaining pool + 5% fee, creating the AWAITING vault", async () => {
    const start = await initiateDeposit(world.event.id, world.user.id);
    expect(start.reference).toMatch(/^hv-/);
    expect(start.simulated).toBe(true); // no PAYSTACK_SECRET_KEY locally
    expect(start.checkoutUrl).toContain("/api/dev/paystack/checkout/");

    const deposit = await prisma.deposit.findUnique({ where: { paystackReference: start.reference } });
    expect(deposit).toMatchObject({
      status: "INITIATED",
      grossAmountKes: 105_000,
      poolAmountKes: 100_000,
      feeKes: 5_000,
    });

    const vault = await prisma.vaultState.findUnique({ where: { eventId: world.event.id } });
    expect(vault?.chainState).toBe("AWAITING");
  });

  it("locks the vault and flips the event LIVE on charge success", async () => {
    const [deposit] = await prisma.deposit.findMany({
      where: { eventId: world.event.id, status: "INITIATED" },
      take: 1,
    });
    const outcome = await recordChargeSuccess({
      reference: deposit.paystackReference,
      channel: "simulation",
      raw: { event: "charge.success", data: { reference: deposit.paystackReference } },
    });

    expect(outcome).toEqual({ outcome: "recorded", vaultLocked: true });

    const [event, vault] = await Promise.all([
      prisma.event.findUnique({ where: { id: world.event.id } }),
      prisma.vaultState.findUnique({ where: { eventId: world.event.id } }),
    ]);
    expect(event?.status).toBe("LIVE");
    expect(event?.prizeVerifiedAt).not.toBeNull();
    expect(vault?.chainState).toBe("LOCKED");
  });

  it("is idempotent: replayed confirmations never double-flip (P3)", async () => {
    const [deposit] = await prisma.deposit.findMany({
      where: { eventId: world.event.id, status: "SUCCEEDED" },
      take: 1,
    });
    const again = await recordChargeSuccess({
      reference: deposit.paystackReference,
      raw: { replay: true },
    });
    expect(again).toEqual({ outcome: "duplicate" });

    const event = await prisma.event.findUnique({ where: { id: world.event.id } });
    expect(event?.status).toBe("LIVE");
    const succeeded = await prisma.deposit.count({
      where: { eventId: world.event.id, status: "SUCCEEDED" },
    });
    expect(succeeded).toBe(1);
  });

  it("refuses new deposits once the event is funded (WRONG_STATE)", async () => {
    await expect(initiateDeposit(world.event.id, world.user.id)).rejects.toMatchObject({
      code: "WRONG_STATE",
    });
  });

  it("supports split deposits: partial first, lock on the completing one", async () => {
    const partial = await createTestWorld("split", "VERIFIED", 100_000);
    try {
      // First: fund 40k of a 100k pool via a manual partial deposit.
      await prisma.deposit.create({
        data: {
          eventId: partial.event.id,
          paystackReference: `hv-${TEST_KEY}-partial`,
          grossAmountKes: 42_000,
          poolAmountKes: 40_000,
          feeKes: 2_000,
          status: "SUCCEEDED",
          paidAt: new Date(),
        },
      });
      await prisma.vaultState.create({
        data: { eventId: partial.event.id, amountKes: 100_000, chainState: "AWAITING" },
      });
      const stillOpen = await initiateDeposit(partial.event.id, partial.user.id);
      expect(stillOpen.simulated).toBe(true);

      const remaining = await prisma.deposit.findUnique({
        where: { paystackReference: stillOpen.reference },
      });
      expect(remaining?.poolAmountKes).toBe(60_000);
      expect(remaining?.grossAmountKes).toBe(63_000);

      // Completing deposit locks the vault.
      const outcome = await recordChargeSuccess({
        reference: stillOpen.reference,
        raw: {},
      });
      expect(outcome).toEqual({ outcome: "recorded", vaultLocked: true });
    } finally {
      await prisma.organization.delete({ where: { id: partial.org.id } });
    }
  });

  it("attests vault creation and locked deposit exactly once (simulation chain)", async () => {
    await attestVaultCreation(world.event.id);
    await attestVaultCreation(world.event.id); // replay — no duplicate ledger row
    await attestVaultLocked(world.event.id);
    await attestVaultLocked(world.event.id);

    const entries = await prisma.ledgerEntry.findMany({
      where: { eventId: world.event.id },
    });
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.type).sort()).toEqual(["DEPOSIT_LOCKED", "VAULT_CREATED"]);
    for (const entry of entries) {
      expect(entry.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    }
  });

  it("expires INITIATED deposits older than 24h (cron)", async () => {
    const stale = await prisma.deposit.create({
      data: {
        eventId: world.event.id,
        paystackReference: `hv-${TEST_KEY}-stale`,
        grossAmountKes: 105_000,
        poolAmountKes: 100_000,
        feeKes: 5_000,
        createdAt: new Date(Date.now() - 25 * 3600 * 1000),
      },
    });
    // The event is already LIVE; the stale sweep only touches INITIATED rows.
    await expect(expireStaleDeposits()).resolves.toBeGreaterThanOrEqual(1);
    const after = await prisma.deposit.findUnique({ where: { id: stale.id } });
    expect(after?.status).toBe("FAILED");
  });

  it("the production webhook route refuses simulation-mode traffic", async () => {
    const result = await processPaystackWebhook("{}", "signature");
    expect(result).toMatchObject({ ok: false, status: 404, reason: "simulation-mode" });
  });

  it("unknown references are reported, never invented (P4)", async () => {
    const outcome = await recordChargeSuccess({
      reference: "hv-unknown-reference",
      raw: {},
    });
    expect(outcome).toEqual({ outcome: "unknown-reference" });
  });

  it("CAPS OVERPAYMENT: a second full-pool deposit records SUCCEEDED but never double-locks the vault", async () => {
    const overpaid = await createTestWorld("overpay", "VERIFIED", 100_000);
    try {
      // First deposit locks the vault (normal path).
      const first = await initiateDeposit(overpaid.event.id, overpaid.user.id);
      const locked = await recordChargeSuccess({ reference: first.reference, raw: {} });
      expect(locked).toEqual({ outcome: "recorded", vaultLocked: true });

      // The double-checkout race: a second INITIATED deposit created while the
      // event was fundable confirms AFTER the vault locked.
      const second = await prisma.deposit.create({
        data: {
          eventId: overpaid.event.id,
          paystackReference: `hv-${TEST_KEY}-overpay-2`,
          grossAmountKes: 105_000,
          poolAmountKes: 100_000,
          feeKes: 5_000,
          status: "INITIATED",
        },
      });
      const outcome = await recordChargeSuccess({
        reference: second.paystackReference,
        raw: { replay: "second-checkout" },
      });

      // The money is real → SUCCEEDED — but flagged, and the vault is untouched.
      expect(outcome).toEqual({ outcome: "recorded", vaultLocked: false, overpayment: true });
      const after = await prisma.deposit.findUnique({ where: { id: second.id } });
      expect(after?.status).toBe("SUCCEEDED");

      const vault = await prisma.vaultState.findUnique({ where: { eventId: overpaid.event.id } });
      expect(vault?.chainState).toBe("LOCKED"); // not double-locked/re-locked
      const event = await prisma.event.findUnique({ where: { id: overpaid.event.id } });
      expect(event?.status).toBe("LIVE");

      const audit = await prisma.auditLog.findFirst({
        where: { action: "escrow.deposit-overpayment", entityId: second.id },
      });
      expect(audit).not.toBeNull();
      expect(audit?.reason).toContain("refund manually");
    } finally {
      await prisma.organization.delete({ where: { id: overpaid.org.id } });
    }
  });

  it("refundLockedVault flips a LOCKED vault to REFUNDED (idempotent) and the refund attests on-chain", async () => {
    const { refundLockedVault } = await import("@/services/escrow/refund");
    const { attestRefund, attestVaultCreation, attestVaultLocked } = await import(
      "@/services/escrow/attestations"
    );
    const { getChainPort } = await import("@/lib/ports/chain");

    // Drive the on-chain simulation vault to LOCKED first (same flow the
    // jobs would take), so the refund attestation has a real state to flip.
    await attestVaultCreation(world.event.id);
    await attestVaultLocked(world.event.id);
    const before = await getChainPort().readVaultState(world.event.id);
    expect(before?.state).toBe("LOCKED");

    const result = await refundLockedVault(world.event.id, "organizer cancelled pre-live", world.user.id);
    expect(result).toEqual({ refunded: true, attested: true });

    const vault = await prisma.vaultState.findUnique({ where: { eventId: world.event.id } });
    expect(vault?.chainState).toBe("REFUNDED");
    expect(vault?.refundedAt).not.toBeNull();

    const audit = await prisma.auditLog.findFirst({
      where: { action: "escrow.refund", entityId: vault!.id },
    });
    expect(audit?.reason).toContain("organizer cancelled pre-live");

    // The state-aware refund attestation writes the VAULT_REFUNDED ledger row.
    await attestRefund(world.event.id, `refund-${world.event.id}`);
    await attestRefund(world.event.id, `refund-${world.event.id}`); // replay — no duplicate
    const onChain = await getChainPort().readVaultState(world.event.id);
    expect(onChain?.state).toBe("REFUNDED");
    const entries = await prisma.ledgerEntry.findMany({
      where: { eventId: world.event.id, type: "VAULT_REFUNDED" },
    });
    expect(entries).toHaveLength(1);

    // Crash-recovery: the ledger row is lost but the chain already refunded →
    // the handler mirrors the row instead of re-writing (and never throws).
    await prisma.ledgerEntry.delete({ where: { id: entries[0].id } });
    await attestRefund(world.event.id, `refund-${world.event.id}`);
    const mirrored = await prisma.ledgerEntry.findFirst({
      where: { eventId: world.event.id, type: "VAULT_REFUNDED" },
    });
    expect(mirrored).not.toBeNull();
    expect((mirrored?.payload as Record<string, unknown>).mirrored).toBe(true);
    expect(mirrored?.txHash).toMatch(/^0x[0-9a-f]{64}$/);

    // Idempotent: a second refund call is a clean no-op.
    const again = await refundLockedVault(world.event.id, "duplicate refund attempt");
    expect(again).toEqual({ refunded: false, attested: false });
  });

  it("refundLockedVault refuses SETTLED vaults and allows HALF_RELEASED (logged)", async () => {
    const { refundLockedVault } = await import("@/services/escrow/refund");

    const settled = await createTestWorld("refund-settled");
    const half = await createTestWorld("refund-half");
    try {
      await prisma.vaultState.create({
        data: { eventId: settled.event.id, amountKes: 100_000, chainState: "SETTLED", settledAt: new Date() },
      });
      const refused = await refundLockedVault(settled.event.id, "too late");
      expect(refused).toEqual({ refunded: false, attested: false });
      const settledVault = await prisma.vaultState.findUnique({ where: { eventId: settled.event.id } });
      expect(settledVault?.chainState).toBe("SETTLED");

      await prisma.vaultState.create({
        data: {
          eventId: half.event.id,
          amountKes: 100_000,
          chainState: "HALF_RELEASED",
          lockedAt: new Date(),
          halfReleasedAt: new Date(),
        },
      });
      const allowed = await refundLockedVault(half.event.id, "dispute resolved in organizer favor");
      expect(allowed).toEqual({ refunded: true, attested: true });
      const halfVault = await prisma.vaultState.findUnique({ where: { eventId: half.event.id } });
      expect(halfVault?.chainState).toBe("REFUNDED");
    } finally {
      await prisma.organization.delete({ where: { id: settled.org.id } });
      await prisma.organization.delete({ where: { id: half.org.id } });
    }
  });

  it("attestation handlers mirror already-applied on-chain state instead of re-writing", async () => {
    const { attestVaultLocked, attestVaultCreation } = await import("@/services/escrow/attestations");
    const { getChainPort } = await import("@/lib/ports/chain");

    const mirrorWorld = await createTestWorld("mirror");
    try {
      // Vault created + locked on-chain, but the DEPOSIT_LOCKED row is missing.
      await prisma.vaultState.create({
        data: { eventId: mirrorWorld.event.id, amountKes: 100_000, chainState: "AWAITING" },
      });
      await attestVaultCreation(mirrorWorld.event.id);
      await prisma.vaultState.update({
        where: { eventId: mirrorWorld.event.id },
        data: { chainState: "LOCKED", lockedAt: new Date() },
      });
      await getChainPort().attest(mirrorWorld.event.id, { kind: "lock", paystackRef: "hv-mirror-test" });

      await attestVaultLocked(mirrorWorld.event.id);
      const entries = await prisma.ledgerEntry.findMany({
        where: { eventId: mirrorWorld.event.id },
      });
      const lockEntries = entries.filter((e) => e.type === "DEPOSIT_LOCKED");
      expect(lockEntries).toHaveLength(1);
      expect((lockEntries[0].payload as Record<string, unknown>).mirrored).toBe(true);

      // The chain was written exactly once — a second handler run is a no-op.
      await attestVaultLocked(mirrorWorld.event.id);
      const after = await prisma.ledgerEntry.count({ where: { eventId: mirrorWorld.event.id } });
      expect(after).toBe(entries.length);
    } finally {
      await prisma.organization.delete({ where: { id: mirrorWorld.org.id } });
    }
  });

  it("advanceStartedEvents flips started LIVE events to IN_PROGRESS (escrow.cron lifecycle leg)", async () => {
    const { advanceStartedEvents } = await import("@/lib/events/status-jobs");
    const started = await createTestWorld("started");
    const pending = await createTestWorld("notstarted");
    try {
      // LIVE and started 1h ago → advances.
      await prisma.event.update({
        where: { id: started.event.id },
        data: { status: "LIVE", startsAt: new Date(Date.now() - 3600 * 1000) },
      });
      // LIVE but starts tomorrow → untouched.
      await prisma.event.update({
        where: { id: pending.event.id },
        data: { status: "LIVE", startsAt: new Date(Date.now() + 24 * 3600 * 1000) },
      });

      const advanced = await advanceStartedEvents();
      expect(advanced).toBeGreaterThanOrEqual(1);

      const [startedAfter, pendingAfter] = await Promise.all([
        prisma.event.findUnique({ where: { id: started.event.id } }),
        prisma.event.findUnique({ where: { id: pending.event.id } }),
      ]);
      expect(startedAfter?.status).toBe("IN_PROGRESS");
      expect(pendingAfter?.status).toBe("LIVE");

      // Idempotent bulk update — a second run has nothing to advance here.
      const again = await advanceStartedEvents();
      const stillInProgress = await prisma.event.findUnique({ where: { id: started.event.id } });
      expect(stillInProgress?.status).toBe("IN_PROGRESS");
      expect(again).toBeLessThanOrEqual(advanced);
    } finally {
      await prisma.organization.delete({ where: { id: started.org.id } });
      await prisma.organization.delete({ where: { id: pending.org.id } });
    }
  });
});

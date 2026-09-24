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
});

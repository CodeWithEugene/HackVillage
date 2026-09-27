import { createHmac } from "node:crypto";

import { beforeAll, afterAll, describe, expect, it } from "vitest";

/**
 * Paystack webhook pipeline (LIVE mode) — integration. A real secret key is
 * set before the module loads so the port runs in live mode; payloads are
 * HMAC-signed exactly like Paystack signs them. Verifies the replay guard,
 * the full charge.success → vault-lock pipeline, and signature enforcement.
 */

try {
  process.loadEnvFile?.();
} catch {
  // No .env in CI — env comes from the workflow.
}
process.env.PAYSTACK_SECRET_KEY = "sk_test_webhook_integration";

const TEST_KEY = `escrow-webhook-${Date.now().toString(36)}`;
const SECRET = process.env.PAYSTACK_SECRET_KEY;
const suiteStartedAt = new Date();

let prisma: typeof import("@/lib/db")["prisma"];
let processPaystackWebhook: typeof import("@/services/escrow/webhook")["processPaystackWebhook"];
let reprocessStaleWebhookEvents: typeof import("@/services/escrow/webhook")["reprocessStaleWebhookEvents"];
let cleanupOrgId: string | null = null;
const cleanupOrgIds: string[] = [];

type PaystackPortType = import("@/lib/ports/paystack").PaystackPort;

function signed(payload: string): { body: string; signature: string } {
  return {
    body: payload,
    signature: createHmac("sha512", SECRET).update(payload).digest("hex"),
  };
}

function chargeSuccess(reference: string): { body: string; signature: string } {
  return signed(
    JSON.stringify({
      event: "charge.success",
      data: { reference, channel: "card", amount: 10500000, currency: "KES" },
    })
  );
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  [{ prisma }, { processPaystackWebhook, reprocessStaleWebhookEvents }] = await Promise.all([
    import("@/lib/db"),
    import("@/services/escrow/webhook"),
  ]);
});

afterAll(async () => {
  if (cleanupOrgId) {
    await prisma.organization.delete({ where: { id: cleanupOrgId } }).catch(() => undefined);
  }
  for (const orgId of cleanupOrgIds) {
    await prisma.organization.delete({ where: { id: orgId } }).catch(() => undefined);
  }
  await prisma.user.deleteMany({ where: { email: { contains: TEST_KEY } } }).catch(() => undefined);
  await prisma
    .$executeRawUnsafe(
      `DELETE FROM pgboss.job WHERE name IN ('escrow.attest-vault-created', 'escrow.attest-vault-locked', 'escrow.attest-refund', 'hackathon.announce') AND created_on >= $1`,
      suiteStartedAt
    )
    .catch(() => undefined);
  await prisma.$disconnect();
});

describe("paystack webhook pipeline (live-mode integration)", () => {
  it("rejects unsigned and wrongly-signed payloads with 401", async () => {
    const body = JSON.stringify({ event: "charge.success", data: {} });
    await expect(processPaystackWebhook(body, null)).resolves.toMatchObject({
      ok: false,
      status: 401,
    });
    await expect(processPaystackWebhook(body, "deadbeef")).resolves.toMatchObject({
      ok: false,
      status: 401,
    });
  });

  it("processes a signed charge.success end-to-end: replay guard, vault lock, LIVE flip", async () => {
    // Test world + manual deposit row (the port is live-mode here — no real
    // checkout call; the deposit exists as if initiated).
    const user = await prisma.user.create({
      data: {
        email: `${TEST_KEY}@hackvillage.test`,
        handle: TEST_KEY.slice(-24),
        emailVerified: new Date(),
        primaryRole: "ORGANIZER",
        onboardingCompletedAt: new Date(),
      },
    });
    const org = await prisma.organization.create({
      data: { name: "Webhook Org", slug: TEST_KEY, ownerId: user.id, kycStatus: "VERIFIED" },
    });
    cleanupOrgId = org.id;
    await prisma.orgMember.create({
      data: { orgId: org.id, userId: user.id, role: "OWNER", status: "ACTIVE" },
    });
    const event = await prisma.event.create({
      data: {
        orgId: org.id,
        slug: `evt-${TEST_KEY}`,
        title: "Webhook Integration Event",
        venueType: "ONLINE",
        startsAt: new Date(Date.now() + 5 * 24 * 3600 * 1000),
        endsAt: new Date(Date.now() + 6 * 24 * 3600 * 1000),
        registrationDeadline: new Date(Date.now() + 4 * 24 * 3600 * 1000),
        problemStatement: "Webhook pipeline integration event.",
        status: "PENDING_DEPOSIT",
        publishedAt: new Date(),
      },
    });
    await prisma.prizeBreakdown.create({
      data: { eventId: event.id, place: 1, label: "1st place", amountKes: 100_000 },
    });
    await prisma.vaultState.create({
      data: { eventId: event.id, amountKes: 100_000, chainState: "AWAITING" },
    });
    const reference = `hv-webhook-${TEST_KEY}`;
    await prisma.deposit.create({
      data: {
        eventId: event.id,
        paystackReference: reference,
        grossAmountKes: 105_000,
        poolAmountKes: 100_000,
        feeKes: 5_000,
        status: "INITIATED",
      },
    });

    // First delivery: processed, vault locked, event LIVE.
    const first = chargeSuccess(reference);
    const result1 = await processPaystackWebhook(first.body, first.signature);
    expect(result1).toMatchObject({ ok: true, status: 200 });

    const [storedEvent, vault] = await Promise.all([
      prisma.event.findUnique({ where: { id: event.id } }),
      prisma.vaultState.findUnique({ where: { eventId: event.id } }),
    ]);
    expect(storedEvent?.status).toBe("LIVE");
    expect(vault?.chainState).toBe("LOCKED");

    // Second delivery of the same payload: replay — one WebhookEvent row only.
    const result2 = await processPaystackWebhook(first.body, first.signature);
    expect(result2).toMatchObject({ ok: true, status: 200, duplicate: true });
    const webhookRows = await prisma.webhookEvent.count({
      where: { source: "PAYSTACK", eventType: "charge.success", reference },
    });
    expect(webhookRows).toBe(1);
  });

  it("records but does not process non-money webhook events", async () => {
    const payload = signed(
      JSON.stringify({ event: "transfer.success", data: { reference: "trf_none" } })
    );
    const result = await processPaystackWebhook(payload.body, payload.signature);
    expect(result).toMatchObject({ ok: true, status: 200 });
    const row = await prisma.webhookEvent.findUnique({
      where: { source_eventType_reference: { source: "PAYSTACK", eventType: "transfer.success", reference: "trf_none" } },
    });
    expect(row?.processedAt).not.toBeNull();
  });

  it("survives well-signed garbage (bad JSON) with a 400", async () => {
    const payload = signed("not-json-at-all");
    const result = await processPaystackWebhook(payload.body, payload.signature);
    expect(result).toMatchObject({ ok: false, status: 400, reason: "bad-json" });
  });
});

/** Builds an isolated event + vault + deposit fixture world per test. */
async function createWebhookWorld(
  label: string,
  depositStatus: "INITIATED" | "FAILED" | "SUCCEEDED" = "INITIATED"
) {
  const key = `${TEST_KEY}-${label}`;
  const user = await prisma.user.create({
    data: {
      email: `${key}@hackvillage.test`,
      handle: key.slice(-24),
      emailVerified: new Date(),
      primaryRole: "ORGANIZER",
      onboardingCompletedAt: new Date(),
    },
  });
  const org = await prisma.organization.create({
    data: { name: `Webhook Org ${key}`, slug: key, ownerId: user.id, kycStatus: "VERIFIED" },
  });
  cleanupOrgIds.push(org.id);
  await prisma.orgMember.create({
    data: { orgId: org.id, userId: user.id, role: "OWNER", status: "ACTIVE" },
  });
  const event = await prisma.event.create({
    data: {
      orgId: org.id,
      slug: `evt-${key}`,
      title: `Webhook ${label} Event`,
      venueType: "ONLINE",
      startsAt: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      endsAt: new Date(Date.now() + 6 * 24 * 3600 * 1000),
      registrationDeadline: new Date(Date.now() + 4 * 24 * 3600 * 1000),
      problemStatement: "Webhook outbox integration event.",
      status: "PENDING_DEPOSIT",
      publishedAt: new Date(),
    },
  });
  await prisma.prizeBreakdown.create({
    data: { eventId: event.id, place: 1, label: "1st place", amountKes: 100_000 },
  });
  await prisma.vaultState.create({
    data: { eventId: event.id, amountKes: 100_000, chainState: "AWAITING" },
  });
  const reference = `hv-${key}`;
  await prisma.deposit.create({
    data: {
      eventId: event.id,
      paystackReference: reference,
      grossAmountKes: 105_000,
      poolAmountKes: 100_000,
      feeKes: 5_000,
      status: depositStatus,
    },
  });
  return { user, org, event, reference };
}

describe("webhook outbox repair (integration)", () => {
  it("a replay of an UNPROCESSED stored event re-processes the stored payload", async () => {
    const world = await createWebhookWorld("replay");
    // Simulate the crash: the event was recorded (unique guard) but the
    // handler never ran — processedAt stays NULL.
    await prisma.webhookEvent.create({
      data: {
        source: "PAYSTACK",
        eventType: "charge.success",
        reference: world.reference,
        signatureOk: true,
        payload: {
          raw: { event: "charge.success", data: { reference: world.reference, channel: "card" } },
        },
      },
    });

    // Paystack retries the delivery → the stored payload is re-driven.
    const retry = chargeSuccess(world.reference);
    const result = await processPaystackWebhook(retry.body, retry.signature);
    expect(result).toMatchObject({ ok: true, status: 200, reprocessed: true });

    const [deposit, vault, event, row] = await Promise.all([
      prisma.deposit.findUnique({ where: { paystackReference: world.reference } }),
      prisma.vaultState.findUnique({ where: { eventId: world.event.id } }),
      prisma.event.findUnique({ where: { id: world.event.id } }),
      prisma.webhookEvent.findUnique({
        where: {
          source_eventType_reference: {
            source: "PAYSTACK",
            eventType: "charge.success",
            reference: world.reference,
          },
        },
      }),
    ]);
    expect(deposit?.status).toBe("SUCCEEDED");
    expect(vault?.chainState).toBe("LOCKED");
    expect(event?.status).toBe("LIVE");
    expect(row?.processedAt).not.toBeNull();

    // A third delivery is a true duplicate — no re-processing, no side effects.
    const third = await processPaystackWebhook(retry.body, retry.signature);
    expect(third).toMatchObject({ ok: true, status: 200, duplicate: true });
  });

  it("reprocessStaleWebhookEvents re-drives events older than 1h stuck unprocessed", async () => {
    const world = await createWebhookWorld("stale");
    const staleAt = new Date(Date.now() - 2 * 3600 * 1000);
    await prisma.webhookEvent.create({
      data: {
        source: "PAYSTACK",
        eventType: "charge.success",
        reference: world.reference,
        signatureOk: true,
        createdAt: staleAt,
        payload: {
          raw: { event: "charge.success", data: { reference: world.reference, channel: "card" } },
        },
      },
    });
    // A non-money stale event routes through the recorder path.
    await prisma.webhookEvent.create({
      data: {
        source: "PAYSTACK",
        eventType: "customeridentification.success",
        reference: `cid-${world.reference}`,
        signatureOk: true,
        createdAt: staleAt,
        payload: { raw: { event: "customeridentification.success", data: {} } },
      },
    });

    const reprocessed = await reprocessStaleWebhookEvents();
    expect(reprocessed).toBeGreaterThanOrEqual(2);

    const [deposit, event, chargeRow, cidRow] = await Promise.all([
      prisma.deposit.findUnique({ where: { paystackReference: world.reference } }),
      prisma.event.findUnique({ where: { id: world.event.id } }),
      prisma.webhookEvent.findFirst({
        where: { eventType: "charge.success", reference: world.reference },
      }),
      prisma.webhookEvent.findFirst({ where: { reference: `cid-${world.reference}` } }),
    ]);
    expect(deposit?.status).toBe("SUCCEEDED");
    expect(event?.status).toBe("LIVE");
    expect(chargeRow?.processedAt).not.toBeNull();
    expect(cidRow?.processedAt).not.toBeNull();
  });

  it("an orphaned charge on an expired deposit is verified with the provider and escalated", async () => {
    const world = await createWebhookWorld("orphan", "FAILED");
    // A stub live port: signature passes and the charge verifies as REAL —
    // the webhook must never call the network in this test.
    const stubPort: PaystackPortType = {
      mode: "live",
      initializeCheckout: async () => {
        throw new Error("unused");
      },
      verifyTransaction: async () => ({
        status: "success",
        amountPesewas: 10_500_000,
        channel: "card",
        raw: { verified: true },
      }),
      verifyWebhookSignature: () => true,
      createTransferRecipient: async () => {
        throw new Error("unused");
      },
      initiateTransfer: async () => {
        throw new Error("unused");
      },
      transferStatus: async () => ({ status: "unknown" }),
    };

    const payload = chargeSuccess(world.reference);
    const result = await processPaystackWebhook(payload.body, payload.signature, stubPort);
    expect(result).toMatchObject({ ok: true, status: 200 });

    // The expired deposit is NOT resurrected — the money path stays fail-closed.
    const deposit = await prisma.deposit.findUnique({
      where: { paystackReference: world.reference },
    });
    expect(deposit?.status).toBe("FAILED");

    // ...but ops gets the full repair trail.
    const audit = await prisma.auditLog.findFirst({
      where: { action: "escrow.orphaned-charge", entityId: deposit!.id },
    });
    expect(audit).not.toBeNull();
    expect(audit?.reason).toContain(world.reference);
  });
});

describe("reversal integrity (integration)", () => {
  it("transfer.reversed on a SUCCEEDED payout keeps SUCCEEDED and pages ops (clawback)", async () => {
    const world = await createWebhookWorld("clawback");
    const team = await prisma.team.create({
      data: {
        eventId: world.event.id,
        name: "Clawback Team",
        leaderId: world.user.id,
        inviteCode: `cl${Math.random().toString(36).slice(2, 8)}`,
      },
    });
    const winner = await prisma.winner.create({
      data: {
        eventId: world.event.id,
        teamId: team.id,
        place: 1,
        userId: world.user.id,
        amountKes: 100_000,
        milestoneRequired: false,
      },
    });
    const reference = `trf-${TEST_KEY}-clawback-1`;
    await prisma.payout.create({
      data: {
        winnerId: winner.id,
        tranche: "INSTANT",
        amountKes: 100_000,
        idempotencyKey: `${winner.id}:INSTANT`,
        recipientCode: "RCP_SIM_CLAWBACK",
        status: "SUCCEEDED",
        paidAt: new Date(),
        paystackReference: reference,
      },
    });

    const payload = signed(
      JSON.stringify({ event: "transfer.reversed", data: { reference } })
    );
    const result = await processPaystackWebhook(payload.body, payload.signature);
    expect(result).toMatchObject({ ok: true, status: 200 });

    // History is never rewritten: the payout stays SUCCEEDED...
    const payout = await prisma.payout.findFirst({ where: { paystackReference: reference } });
    expect(payout?.status).toBe("SUCCEEDED");

    // ...and the clawback is on the audit trail with full repair context.
    const audit = await prisma.auditLog.findFirst({
      where: { action: "payout.reversed-after-success", entityId: payout!.id },
    });
    expect(audit).not.toBeNull();
    expect(audit?.reason).toContain(reference);
  });

  it("transfer.reversed on a non-succeeded payout still flips it to REVERSED", async () => {
    const world = await createWebhookWorld("reversed");
    const team = await prisma.team.create({
      data: {
        eventId: world.event.id,
        name: "Reversed Team",
        leaderId: world.user.id,
        inviteCode: `rv${Math.random().toString(36).slice(2, 8)}`,
      },
    });
    const winner = await prisma.winner.create({
      data: {
        eventId: world.event.id,
        teamId: team.id,
        place: 1,
        userId: world.user.id,
        amountKes: 100_000,
        milestoneRequired: false,
      },
    });
    const reference = `trf-${TEST_KEY}-reversed-1`;
    await prisma.payout.create({
      data: {
        winnerId: winner.id,
        tranche: "INSTANT",
        amountKes: 100_000,
        idempotencyKey: `${winner.id}:INSTANT`,
        recipientCode: "RCP_SIM_REVERSED",
        status: "PROCESSING",
        paystackReference: reference,
      },
    });

    const payload = signed(
      JSON.stringify({ event: "transfer.reversed", data: { reference } })
    );
    const result = await processPaystackWebhook(payload.body, payload.signature);
    expect(result).toMatchObject({ ok: true, status: 200 });

    const payout = await prisma.payout.findFirst({ where: { paystackReference: reference } });
    expect(payout?.status).toBe("REVERSED");
    const audit = await prisma.auditLog.findFirst({
      where: { action: "payout.reversed-after-success", entityId: payout!.id },
    });
    expect(audit).toBeNull(); // no clawback path for a non-SUCCEEDED payout
  });
});

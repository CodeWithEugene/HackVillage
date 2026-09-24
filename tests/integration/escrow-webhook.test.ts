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

let prisma: typeof import("@/lib/db")["prisma"];
let processPaystackWebhook: typeof import("@/services/escrow/webhook")["processPaystackWebhook"];
let cleanupOrgId: string | null = null;

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
  [{ prisma }, { processPaystackWebhook }] = await Promise.all([
    import("@/lib/db"),
    import("@/services/escrow/webhook"),
  ]);
});

afterAll(async () => {
  if (cleanupOrgId) {
    await prisma.organization.delete({ where: { id: cleanupOrgId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: { contains: TEST_KEY } } }).catch(() => undefined);
  }
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

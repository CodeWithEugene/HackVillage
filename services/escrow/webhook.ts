import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { getPaystackPort } from "@/lib/ports/paystack";
import { recordChargeSuccess } from "@/services/escrow/deposits";

/**
 * Escrow service — Paystack webhook pipeline (plan §10.3 STEP 4, §14.2).
 * Order of operations is the security posture:
 *   1. HMAC verify over the RAW body (constant-time).
 *   2. Replay guard: unique (source, eventType, reference) — duplicates are
 *      recorded as such and never re-processed.
 *   3. Only then does the money state machine run (idempotent anyway — P3).
 */

export interface WebhookResult {
  ok: boolean;
  status: number;
  duplicate?: boolean;
  reason?: string;
}

interface PaystackWebhookPayload {
  event?: string;
  data?: { reference?: string; channel?: string };
}

export async function processPaystackWebhook(
  rawBody: string,
  signature: string | null
): Promise<WebhookResult> {
  const port = getPaystackPort();

  // Simulation mode never receives webhooks — the production route rejects.
  if (port.mode === "simulation") {
    return { ok: false, status: 404, reason: "simulation-mode" };
  }

  if (!port.verifyWebhookSignature(rawBody, signature)) {
    console.error("[webhook] PAYSTACK signature verification failed");
    return { ok: false, status: 401, reason: "bad-signature" };
  }

  let payload: PaystackWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as PaystackWebhookPayload;
  } catch {
    return { ok: false, status: 400, reason: "bad-json" };
  }

  const eventType = payload.event ?? "unknown";
  const reference = payload.data?.reference ?? "unknown";
  const signatureOk = true; // reached only after verification

  // Forensics first: retain every verified payload (P10).
  const stored = await prisma.webhookEvent
    .create({
      data: {
        source: "PAYSTACK",
        eventType,
        reference,
        signatureOk,
        payload: { raw: payload } as unknown as Prisma.InputJsonValue,
      },
    })
    .catch((error: { code?: string }) => {
      if (error.code === "P2002") return null; // replay — already seen
      throw error;
    });

  if (!stored) {
    return { ok: true, status: 200, duplicate: true };
  }

  if (eventType === "transfer.success") {
    const payout = await prisma.payout.findFirst({
      where: { paystackReference: reference },
      select: { id: true },
    });
    if (payout) {
      const { confirmTransferSuccess } = await import("@/services/payout/service");
      await confirmTransferSuccess(payout.id, reference);
    } else {
      console.error(`[webhook] transfer.success with unknown reference: ${reference}`);
    }
    await prisma.webhookEvent.update({
      where: { id: stored.id },
      data: { processedAt: new Date() },
    });
    return { ok: true, status: 200 };
  }

  if (eventType === "transfer.failed" || eventType === "transfer.reversed") {
    // Terminal failure from the provider: straight to the ops queue — funds
    // stay locked; a human decides (P4 fail-closed).
    const payout = await prisma.payout.findFirst({
      where: { paystackReference: reference },
      select: { id: true },
    });
    if (payout) {
      await prisma.payout.updateMany({
        where: { id: payout.id, status: { not: "SUCCEEDED" } },
        data: {
          status: eventType === "transfer.reversed" ? "REVERSED" : "MANUAL_REVIEW",
          lastError: `Provider reported ${eventType}.`,
        },
      });
    } else {
      console.error(`[webhook] ${eventType} with unknown reference: ${reference}`);
    }
    await prisma.webhookEvent.update({
      where: { id: stored.id },
      data: { processedAt: new Date() },
    });
    return { ok: true, status: 200 };
  }

  if (eventType !== "charge.success") {
    // Recorded for forensics; other events are not processed yet.
    await prisma.webhookEvent.update({
      where: { id: stored.id },
      data: { processedAt: new Date() },
    });
    return { ok: true, status: 200 };
  }

  const outcome = await recordChargeSuccess({
    reference,
    channel: payload.data?.channel ?? null,
    raw: payload,
  });

  await prisma.webhookEvent.update({
    where: { id: stored.id },
    data: { processedAt: new Date() },
  });

  if (outcome.outcome === "unknown-reference") {
    // A real payment we cannot map — alert loudly, never crash the 200 (the
    // funds are NOT lost; the deposit row stays INITIATED until reconciled).
    console.error(`[webhook] charge.success with unknown reference: ${reference}`);
  }

  return { ok: true, status: 200 };
}

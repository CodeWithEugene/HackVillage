import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { getPaystackPort, type PaystackPort } from "@/lib/ports/paystack";
import { alertAdmins } from "@/lib/notifications/admin-alert";
import { renderEmail, renderText, type EmailTemplate } from "@/lib/notifications/layout";
import { html } from "@/lib/notifications/html";
import { transferReversedAdminEmail } from "@/lib/notifications/templates/payouts";
import { appUrl } from "@/lib/url";
import { recordChargeSuccess } from "@/services/escrow/deposits";

/**
 * Escrow service — Paystack webhook pipeline (plan §10.3 STEP 4, §14.2).
 * Order of operations is the security posture:
 *   1. HMAC verify over the RAW body (constant-time).
 *   2. Replay guard: unique (source, eventType, reference) — duplicates are
 *      recorded as such and never re-processed. EXCEPTION (outbox repair):
 *      a stored event whose processedAt is still NULL crashed between record
 *      and process — the replay RE-PROCESSES the stored payload through the
 *      same idempotent handlers instead of being swallowed as a duplicate.
 *   3. Only then does the money state machine run (idempotent anyway — P3).
 */

export interface WebhookResult {
  ok: boolean;
  status: number;
  duplicate?: boolean;
  reprocessed?: boolean;
  reason?: string;
}

interface PaystackWebhookPayload {
  event?: string;
  data?: { reference?: string; channel?: string };
}

export async function processPaystackWebhook(
  rawBody: string,
  signature: string | null,
  portOverride?: PaystackPort
): Promise<WebhookResult> {
  const port = portOverride ?? getPaystackPort();

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
    // Replay of a previously seen event. If the original delivery crashed
    // after recording but before processing (processedAt IS NULL), this
    // replay is the outbox's second chance: re-drive the STORED payload
    // through the same idempotent handlers (P3 makes this safe).
    const existing = await prisma.webhookEvent.findUnique({
      where: {
        source_eventType_reference: { source: "PAYSTACK", eventType, reference },
      },
    });
    if (existing && existing.processedAt == null) {
      const raw = (existing.payload as { raw?: PaystackWebhookPayload } | null)?.raw;
      if (raw) {
        console.warn(
          `[webhook] replay of unprocessed event ${eventType}/${reference} — re-processing stored payload`
        );
        await routeVerifiedEvent(existing.id, raw, port);
        return { ok: true, status: 200, reprocessed: true };
      }
    }
    return { ok: true, status: 200, duplicate: true };
  }

  await routeVerifiedEvent(stored.id, payload, port);
  return { ok: true, status: 200 };
}

/**
 * Outbox sweeper (wired into escrow.cron): events older than one hour that
 * were recorded but never processed get re-driven through the same handlers.
 * Bounded batch; every handler is idempotent, so overlap with a live
 * delivery is harmless.
 */
export async function reprocessStaleWebhookEvents(limit = 25): Promise<number> {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  const stale = await prisma.webhookEvent.findMany({
    where: { processedAt: null, createdAt: { lt: cutoff } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let reprocessed = 0;
  for (const event of stale) {
    const raw = (event.payload as { raw?: PaystackWebhookPayload } | null)?.raw;
    if (!raw || typeof raw !== "object") {
      // No usable payload — mark processed so the sweep stops re-selecting it.
      console.error(`[webhook] stale event ${event.id} (${event.eventType}) has no payload — skipping`);
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date() },
      });
      continue;
    }
    await routeVerifiedEvent(event.id, raw, getPaystackPort());
    reprocessed += 1;
  }
  return reprocessed;
}

/** Route one verified payload through the money state machine + mark done. */
async function routeVerifiedEvent(
  webhookEventId: string,
  payload: PaystackWebhookPayload,
  port: PaystackPort
): Promise<void> {
  const eventType = payload.event ?? "unknown";
  const reference = payload.data?.reference ?? "unknown";

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
    await markProcessed(webhookEventId);
    return;
  }

  if (eventType === "transfer.failed" || eventType === "transfer.reversed") {
    // Terminal failure from the provider: straight to the ops queue — funds
    // stay locked; a human decides (P4 fail-closed).
    const payout = await prisma.payout.findFirst({
      where: { paystackReference: reference },
      select: {
        id: true,
        status: true,
        amountKes: true,
        winner: {
          select: {
            user: { select: { handle: true } },
            event: { select: { title: true } },
          },
        },
      },
    });
    if (payout) {
      if (eventType === "transfer.reversed" && payout.status === "SUCCEEDED") {
        // Clawback after success: the winner was already paid and the vault
        // advanced. NEVER rewrite history — keep SUCCEEDED, page the admins
        // with full repair context, and audit it (P10).
        console.error(
          `[webhook] CLAWBACK AFTER SUCCESS: transfer.reversed for SUCCEEDED payout=${payout.id} reference=${reference} amount=${payout.amountKes} KES — manual recovery required`
        );
        await prisma.auditLog.create({
          data: {
            actorId: null,
            action: "payout.reversed-after-success",
            entity: "Payout",
            entityId: payout.id,
            reason: `Paystack reversed transfer ${reference} AFTER the payout succeeded — funds clawed back provider-side`,
            meta: {
              reference,
              amountKes: payout.amountKes,
              winnerHandle: payout.winner.user.handle,
              eventTitle: payout.winner.event.title,
            },
          },
        });
        await alertAdmins(
          clawbackAfterSuccessEmail(
            payout.winner.event.title,
            payout.id,
            reference,
            payout.amountKes,
            payout.winner.user.handle
          )
        ).catch((error: unknown) => console.error("[webhook] admin alert failed", error));
      } else {
        await prisma.payout.updateMany({
          where: { id: payout.id, status: { not: "SUCCEEDED" } },
          data: {
            status: eventType === "transfer.reversed" ? "REVERSED" : "MANUAL_REVIEW",
            lastError: `Provider reported ${eventType}.`,
          },
        });
        await alertAdmins(
          transferReversedAdminEmail(payout.winner.event.title, reference, appUrl("/admin/payments"))
        ).catch((error: unknown) => console.error("[webhook] admin alert failed", error));
      }
    } else {
      console.error(`[webhook] ${eventType} with unknown reference: ${reference}`);
    }
    await markProcessed(webhookEventId);
    return;
  }

  if (eventType !== "charge.success") {
    // Recorded for forensics; other events are not processed yet.
    await markProcessed(webhookEventId);
    return;
  }

  const outcome = await recordChargeSuccess({
    reference,
    channel: payload.data?.channel ?? null,
    raw: payload,
  });

  if (outcome.outcome === "unknown-reference") {
    // A real payment we cannot map — alert loudly, never crash the 200 (the
    // funds are NOT lost; the deposit row stays INITIATED until reconciled).
    console.error(`[webhook] charge.success with unknown reference: ${reference}`);
  }

  if (outcome.outcome === "not-initiated") {
    // The expired-deposit race: the checkout outlived our 24h INITIATED
    // window and the sweep already failed the deposit. If the charge is real
    // at Paystack, ops must repair by hand — alert with full context.
    await verifyAndAlertOrphanedCharge(reference, port);
  }

  await markProcessed(webhookEventId);
}

async function markProcessed(webhookEventId: string): Promise<void> {
  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { processedAt: new Date() },
  });
}

/**
 * Verify an unmatched charge against provider truth; when real money landed
 * on a deposit we can no longer credit, escalate with everything ops needs
 * to repair it manually (deposit ref, amounts, organizer email).
 */
async function verifyAndAlertOrphanedCharge(
  reference: string,
  port: PaystackPort
): Promise<void> {
  let verification: Awaited<ReturnType<PaystackPort["verifyTransaction"]>> = null;
  try {
    verification = await port.verifyTransaction(reference);
  } catch (error) {
    console.error(`[webhook] verifyTransaction(${reference}) failed`, error);
  }
  if (!verification || verification.status !== "success") {
    console.error(
      `[webhook] charge.success for lapsed deposit ${reference} could not be verified with Paystack — investigate manually`
    );
    return;
  }

  const deposit = await prisma.deposit.findUnique({
    where: { paystackReference: reference },
    select: {
      id: true,
      status: true,
      grossAmountKes: true,
      poolAmountKes: true,
      event: {
        select: {
          slug: true,
          title: true,
          org: { select: { owner: { select: { email: true } } } },
        },
      },
    },
  });

  console.error(
    `[webhook] ORPHANED CHARGE: ${reference} verified real at Paystack ` +
      `(${verification.amountPesewas / 100} KES via ${verification.channel ?? "unknown"}) ` +
      `but deposit is ${deposit?.status ?? "missing"} — manual repair required`
  );
  await prisma.auditLog.create({
    data: {
      actorId: null,
      action: "escrow.orphaned-charge",
      entity: "Deposit",
      entityId: deposit?.id ?? null,
      reason: `charge.success verified at Paystack for ${deposit?.status ?? "unknown"} deposit ${reference} (expired-deposit race)`,
      meta: {
        reference,
        depositStatus: deposit?.status ?? null,
        grossAmountKes: deposit?.grossAmountKes ?? null,
        poolAmountKes: deposit?.poolAmountKes ?? null,
        amountPesewas: verification.amountPesewas,
        channel: verification.channel,
      },
    },
  });
  await alertAdmins(
    orphanedChargeEmail({
      reference,
      eventSlug: deposit?.event.slug ?? "unknown",
      eventTitle: deposit?.event.title ?? "Unknown hackathon",
      grossAmountKes: deposit?.grossAmountKes ?? verification.amountPesewas / 100,
      organizerEmail: deposit?.event.org.owner.email ?? "unknown",
      depositStatus: deposit?.status ?? "missing",
    })
  ).catch((error: unknown) => console.error("[webhook] admin alert failed", error));
}

function orphanedChargeEmail(input: {
  reference: string;
  eventSlug: string;
  eventTitle: string;
  grossAmountKes: number;
  organizerEmail: string;
  depositStatus: string;
}): EmailTemplate {
  return {
    subject: `Orphaned Charge Needs Repair: ${input.eventTitle}`,
    html: renderEmail({
      preheader: "Real money arrived for a deposit we can no longer credit.",
      section: {
        heading: "Orphaned Charge — Manual Repair",
        bodyHtml: html`<p style="margin:0;">Paystack confirmed a charge for <strong>${input.eventTitle}</strong>, but the deposit was already ${input.depositStatus} (the organizer paid after the 24h window). The money is NOT lost — verify the charge in Paystack, then either refund it or credit the vault manually.</p>`,
        details: [
          { label: "Deposit reference", value: input.reference },
          { label: "Hackathon", value: input.eventSlug },
          { label: "Gross amount", value: `KES ${input.grossAmountKes.toLocaleString("en-KE")}` },
          { label: "Organizer", value: input.organizerEmail },
        ],
        ctaUrl: appUrl("/admin/payments"),
        ctaLabel: "Open The Admin Queue",
      },
    }),
    text: renderText([
      `Orphaned charge for ${input.eventTitle} (${input.eventSlug}).`,
      `Deposit reference ${input.reference}, status ${input.depositStatus}, gross KES ${input.grossAmountKes}.`,
      `Organizer: ${input.organizerEmail}. Verify in Paystack, then refund or credit manually.`,
      appUrl("/admin/payments"),
    ]),
  };
}

function clawbackAfterSuccessEmail(
  eventTitle: string,
  payoutId: string,
  reference: string,
  amountKes: number,
  winnerHandle: string
): EmailTemplate {
  return {
    subject: `Clawback After Success: ${eventTitle}`,
    html: renderEmail({
      preheader: "Paystack reversed a transfer that had already succeeded.",
      section: {
        heading: "Clawback After Success",
        bodyHtml: html`<p style="margin:0;">Paystack reversed transfer <strong>${reference}</strong> for <strong>${eventTitle}</strong> AFTER the payout succeeded and the vault advanced. The payout stays SUCCEEDED (history is never rewritten). Recover the funds with the winner and reconcile the vault by hand.</p>`,
        details: [
          { label: "Payout", value: payoutId },
          { label: "Winner", value: `@${winnerHandle}` },
          { label: "Amount", value: `KES ${amountKes.toLocaleString("en-KE")}` },
          { label: "Reference", value: reference },
        ],
        ctaUrl: appUrl("/admin/payments"),
        ctaLabel: "Open The Admin Queue",
      },
    }),
    text: renderText([
      `Paystack reversed transfer ${reference} for ${eventTitle} after success.`,
      `Payout ${payoutId}, winner @${winnerHandle}, KES ${amountKes}.`,
      `The payout stays SUCCEEDED — recover funds manually.`,
      appUrl("/admin/payments"),
    ]),
  };
}

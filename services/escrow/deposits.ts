import { randomBytes } from "node:crypto";

import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/db";
import { getPaystackPort } from "@/lib/ports/paystack";
import { sendNotification } from "@/lib/notifications/send";
import { sendMail } from "@/lib/ports/mail";
import {
  depositFailedEmail,
  eventLiveDeveloperEmail,
  eventLiveOrganizerEmail,
} from "@/lib/notifications/templates/events";
import { appUrl } from "@/lib/url";
import {
  depositPlanForPool,
  depositReference,
  poolCovered,
  remainingPoolKes,
} from "@/services/escrow/fees";

/**
 * Escrow service — deposits (Phase 3). HARD BOUNDARY (ADR-001): only this
 * service touches Deposit/VaultState rows and only the Paystack port talks
 * to the payment provider. Everything is idempotent (P3) and fail-closed (P4).
 */

export interface DepositStart {
  checkoutUrl: string;
  simulated: boolean;
  reference: string;
}

/**
 * Organizer initiates a deposit for the remaining pool. Requires the event to
 * be published-and-pending and the organization KYB-verified (CBK compliance
 * via the licensed-PSP rails, plan §14.3). Authorization is an explicit
 * userId — the caller (server action) resolves the session; the service
 * re-verifies org membership.
 */
export async function initiateDeposit(eventId: string, userId: string): Promise<DepositStart> {
  const env = getEnv();

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      org: { include: { members: { where: { userId, status: "ACTIVE" } } } },
      prizes: { select: { amountKes: true } },
      deposits: { where: { status: "SUCCEEDED" }, select: { poolAmountKes: true } },
      vault: true,
    },
  });

  if (!event) throw new DepositError("Event not found.", "NOT_FOUND");
  if (event.status !== "PENDING_DEPOSIT") {
    throw new DepositError(
      event.status === "DRAFT" ? "Publish the event first." : "This event is already funded.",
      "WRONG_STATE"
    );
  }
  const membership = event.org.members[0];
  if (!membership || membership.role === "MEMBER") {
    throw new DepositError("Only organization admins can fund the vault.", "FORBIDDEN");
  }
  if (event.org.kycStatus !== "VERIFIED") {
    throw new DepositError(
      "Your organization needs verified KYB before funding an event.",
      "KYB_REQUIRED"
    );
  }

  const declaredPool = event.prizes.reduce((sum, prize) => sum + prize.amountKes, 0);
  const succeededPool = event.deposits.reduce((sum, d) => sum + d.poolAmountKes, 0);
  const remaining = remainingPoolKes(declaredPool, succeededPool);
  if (remaining <= 0) {
    throw new DepositError("The vault is already fully funded.", "ALREADY_FUNDED");
  }

  const plan = depositPlanForPool(remaining, env.PLATFORM_FEE_BPS);
  const reference = depositReference(event.id, randomBytes(6).toString("hex"));

  // VaultState exists from the first deposit attempt (AWAITING until locked).
  if (!event.vault) {
    await prisma.vaultState.create({
      data: { eventId: event.id, amountKes: declaredPool, chainState: "AWAITING" },
    });
  }

  const member = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  const checkout = await getPaystackPort().initializeCheckout({
    reference,
    amountKes: plan.grossAmountKes,
    email: member?.email ?? "organizer@hackvillage.invalid",
    metadata: { eventId: event.id, kind: "prize_vault" },
  });

  await prisma.deposit.create({
    data: {
      eventId: event.id,
      paystackReference: reference,
      grossAmountKes: plan.grossAmountKes,
      poolAmountKes: plan.poolAmountKes,
      feeKes: plan.feeKes,
      authorizationUrl: checkout.authorizationUrl,
    },
  });

  // Best-effort: the vault-creation attestation follows the deposit attempt.
  const { enqueue } = await import("@/lib/queue");
  await enqueue("escrow.attest-vault-created", { eventId: event.id }, {
    singletonKey: `vault-created:${event.id}`,
  });

  return { checkoutUrl: checkout.authorizationUrl, simulated: checkout.simulated, reference };
}

export type ChargeOutcome =
  | { outcome: "recorded"; vaultLocked: boolean }
  | { outcome: "duplicate" }
  | { outcome: "unknown-reference" }
  | { outcome: "not-initiated" };

/**
 * The money state machine step: a deposit webhook confirms. Idempotent —
 * replays return "duplicate" with zero side effects (P3). The vault locks
 * and the event goes LIVE in the SAME transaction as the deposit flip (P2).
 */
export async function recordChargeSuccess(input: {
  reference: string;
  channel?: string | null;
  raw: unknown;
}): Promise<ChargeOutcome> {
  const deposit = await prisma.deposit.findUnique({
    where: { paystackReference: input.reference },
    include: {
      event: {
        include: {
          prizes: { select: { amountKes: true } },
          deposits: { where: { status: "SUCCEEDED" }, select: { poolAmountKes: true } },
          vault: true,
        },
      },
    },
  });

  if (!deposit) return { outcome: "unknown-reference" };
  if (deposit.status === "SUCCEEDED") return { outcome: "duplicate" };
  if (deposit.status !== "INITIATED") return { outcome: "not-initiated" };

  const event = deposit.event;
  const declaredPool = event.prizes.reduce((sum, prize) => sum + prize.amountKes, 0);

  // The deposit's recorded pool portion is authoritative (computed at
  // initiation), so a forged/short amount webhook cannot over-credit.
  const succeededPool =
    event.deposits.reduce((sum, d) => sum + d.poolAmountKes, 0) + deposit.poolAmountKes;
  const covered = poolCovered([succeededPool], declaredPool);

  await prisma.$transaction(async (tx) => {
    await tx.deposit.update({
      where: { id: deposit.id },
      data: {
        status: "SUCCEEDED",
        paidAt: new Date(),
        channel: input.channel ?? null,
        rawWebhook: input.raw as object,
      },
    });

    if (covered && event.vault && event.vault.chainState === "AWAITING") {
      await tx.vaultState.update({
        where: { eventId: event.id },
        data: { chainState: "LOCKED", lockedAt: new Date() },
      });
      await tx.event.update({
        where: { id: event.id },
        data: { status: "LIVE", prizeVerifiedAt: new Date() },
      });
    }
  });

  // Best-effort attestation enqueue after the money state committed (§10.3).
  if (covered) {
    const { enqueue } = await import("@/lib/queue");
    await enqueue("escrow.attest-vault-locked", { eventId: event.id }, {
      singletonKey: `vault-locked:${event.id}`,
    });

    // Best-effort notifications, never allowed to affect the money outcome.
    await notifyEventLive(event.id).catch((error: unknown) => {
      console.error("[escrow] event live notification failed", error);
    });
  }

  return { outcome: "recorded", vaultLocked: covered };
}

/** Notifies the organizer and registered developers once a vault locks. */
async function notifyEventLive(eventId: string): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      title: true,
      slug: true,
      org: { select: { owner: { select: { id: true, email: true } } } },
      registrations: {
        where: { status: "REGISTERED" },
        select: { user: { select: { id: true, email: true } } },
      },
    },
  });
  if (!event) return;

  const eventUrl = appUrl(`/events/${event.slug}`);
  await sendMail({ to: event.org.owner.email, ...eventLiveOrganizerEmail(event.title, eventUrl) });

  for (const registration of event.registrations) {
    await sendNotification({
      userId: registration.user.id,
      to: registration.user.email,
      category: "eventUpdates",
      template: eventLiveDeveloperEmail(event.title, eventUrl),
    });
  }
}

/** Cron: INITIATED deposits expire after 24h — no orphan money states. */
export async function expireStaleDeposits(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const stale = await prisma.deposit.findMany({
    where: { status: "INITIATED", createdAt: { lt: cutoff } },
    select: {
      id: true,
      event: {
        select: { title: true, slug: true, org: { select: { owner: { select: { email: true } } } } },
      },
    },
  });
  if (stale.length === 0) return 0;

  const expired = await prisma.deposit.updateMany({
    where: { id: { in: stale.map((deposit) => deposit.id) } },
    data: { status: "FAILED" },
  });

  for (const deposit of stale) {
    await sendMail({
      to: deposit.event.org.owner.email,
      ...depositFailedEmail(deposit.event.title, appUrl(`/organizer/events/${deposit.event.slug}`)),
    }).catch((error: unknown) => console.error("[escrow] deposit expired notification failed", error));
  }

  return expired.count;
}

export class DepositError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "WRONG_STATE" | "FORBIDDEN" | "KYB_REQUIRED" | "ALREADY_FUNDED"
  ) {
    super(message);
  }
}

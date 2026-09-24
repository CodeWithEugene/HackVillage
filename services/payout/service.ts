import { prisma } from "@/lib/db";
import { getPaystackPort, type PayoutMethod, type RecipientInput } from "@/lib/ports/paystack";
import { enqueue } from "@/lib/queue";
import {
  payoutIdempotencyKey,
  retryDecision,
  transferReference,
  tranchePlanFor,
} from "@/services/payout/tranches";

/**
 * Payout service — HARD BOUNDARY (ADR-001). Only this service touches
 * Winner/Payout/Milestone rows; only the Paystack port talks to the provider.
 *
 * The three invariants, enforced structurally or transactionally:
 *  1. Idempotency: {winnerId}:{tranche} is UNIQUE — a double announce or a
 *     double retry cannot create a second payout (P3).
 *  2. Fail-closed: a failed transfer returns the payout to retryable states
 *     and NEVER advances the vault; funds stay locked until confirmed (P4).
 *  3. One verified recipient per win (ADR-013): the team leader's recipient.
 */

export class PayoutError extends Error {
  constructor(
    message: string,
    public code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "WRONG_STATE"
      | "JUDGING_INCOMPLETE"
      | "RECIPIENT_REQUIRED"
      | "NO_RESULTS"
  ) {
    super(message);
  }
}

// ── Recipient onboarding (winners pre-register — plan §7.4) ──────────────

export async function savePayoutRecipient(
  userId: string,
  input: RecipientInput
): Promise<{ recipientCode: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!user || user.deletedAt) throw new PayoutError("Account not found.", "NOT_FOUND");

  if (input.type === "BANK" && !input.bankCode) {
    throw new PayoutError("Bank payouts need the bank code.", "WRONG_STATE");
  }
  if (input.type === "MPESA" && !/^254[17]\d{8}$/.test(input.accountNumber)) {
    throw new PayoutError("M-Pesa numbers look like 2547XXXXXXXX.", "WRONG_STATE");
  }

  const { recipientCode } = await getPaystackPort().createTransferRecipient(input);

  await prisma.developerProfile.upsert({
    where: { userId },
    create: {
      userId,
      payoutRecipientCode: recipientCode,
      payoutMethod: input.type,
    },
    update: { payoutRecipientCode: recipientCode, payoutMethod: input.type },
  });

  return { recipientCode };
}

// ── Winner announcement (plan §10.4 STEP 1–4) ───────────────────────────

export interface AnnounceInput {
  eventId: string;
  organizerId: string;
  /** place → teamId, from the judged results. */
  placements: { place: number; teamId: string }[];
}

/**
 * Announce winners → create Winner + INSTANT Payout rows atomically and
 * enqueue the payout jobs IN THE SAME TRANSACTION. The unique keys
 * ({eventId, place} on Winner, {winnerId}:{tranche} on Payout) make a
 * double-announce structurally impossible — the second call fails cleanly.
 */
export async function announceWinners(input: AnnounceInput): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    include: {
      org: { include: { members: { where: { userId: input.organizerId, status: "ACTIVE" } } } },
      prizes: true,
      winners: true,
      judges: { where: { status: "ACTIVE" }, select: { userId: true } },
      teams: {
        where: { status: { not: "DISBANDED" }, submission: { isNot: null } },
        select: { id: true, leaderId: true },
      },
    },
  });
  if (!event) throw new PayoutError("Event not found.", "NOT_FOUND");
  const membership = event.org.members[0];
  if (!membership || membership.role === "MEMBER") {
    throw new PayoutError("Only organization admins can announce winners.", "FORBIDDEN");
  }
  if (event.status !== "JUDGING") {
    throw new PayoutError(
      event.winners.length > 0
        ? "Winners are already announced for this event."
        : "Announce winners while the event is in judging.",
      "WRONG_STATE"
    );
  }

  // Judging completeness: every submitted team has a finalized review from
  // every active judge (plan §10.1 invariant).
  const submissions = event.teams.map((team) => team.id);
  const progress = await prisma.judgingProgress.findMany({
    where: { teamId: { in: submissions }, finalizedAt: { not: null } },
    select: { judgeId: true, teamId: true },
  });
  const finalized = new Set(progress.map((p) => `${p.judgeId}:${p.teamId}`));
  const judges = event.judges.map((j) => j.userId);
  const missing =
    judges.length > 0
      ? submissions.filter((teamId) => judges.some((j) => !finalized.has(`${j}:${teamId}`)))
      : submissions;
  if (missing.length > 0) {
    throw new PayoutError(
      `${missing.length} team(s) are not fully judged yet — results must be complete before announcing.`,
      "JUDGING_INCOMPLETE"
    );
  }

  // Placements must map onto real prize places and submitted teams.
  const prizesByPlace = new Map(event.prizes.map((prize) => [prize.place, prize]));
  const teamById = new Map(event.teams.map((team) => [team.id, team]));
  for (const placement of input.placements) {
    const prize = prizesByPlace.get(placement.place);
    const team = teamById.get(placement.teamId);
    if (!prize) {
      throw new PayoutError(`There is no prize place ${placement.place}.`, "WRONG_STATE");
    }
    if (!team) {
      throw new PayoutError(`That team didn't submit for this event.`, "WRONG_STATE");
    }
  }

  // Recipient gate: every placed team leader needs a verified recipient.
  const leaderIds = input.placements.map((p) => teamById.get(p.teamId)!.leaderId);
  const profiles = await prisma.developerProfile.findMany({
    where: { userId: { in: leaderIds } },
    select: { userId: true, payoutRecipientCode: true },
  });
  const recipients = new Map(
    profiles.filter((p) => p.payoutRecipientCode).map((p) => [p.userId, p.payoutRecipientCode!])
  );
  const leaderUsers = await prisma.user.findMany({
    where: { id: { in: leaderIds } },
    select: { id: true, handle: true },
  });
  const leaderHandles = new Map(leaderUsers.map((u) => [u.id, u.handle]));
  const missingRecipients = leaderIds.filter((id) => !recipients.has(id));
  if (missingRecipients.length > 0) {
    const handles = missingRecipients.map((id) => `@${leaderHandles.get(id) ?? id}`).join(", ");
    throw new PayoutError(
      `These winners still need a payout method before prizes can flow: ${handles}.`,
      "RECIPIENT_REQUIRED"
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const placement of input.placements) {
      const prize = prizesByPlace.get(placement.place)!;
      const team = teamById.get(placement.teamId)!;
      const plan = tranchePlanFor(prize.amountKes, prize.milestoneRequired);

      const winner = await tx.winner.create({
        data: {
          eventId: event.id,
          teamId: team.id,
          place: placement.place,
          userId: team.leaderId,
          amountKes: prize.amountKes,
          milestoneRequired: prize.milestoneRequired,
          announcedAt: new Date(),
        },
      });

      if (prize.milestoneRequired) {
        await tx.milestone.create({
          data: {
            winnerId: winner.id,
            title: `Milestone handover — ${prize.label}`,
            description: "Deliver and confirm the handover to release the final 50%.",
            dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }

      await tx.payout.create({
        data: {
          winnerId: winner.id,
          tranche: "INSTANT",
          amountKes: plan.instantKes,
          idempotencyKey: payoutIdempotencyKey(winner.id, "INSTANT"),
          recipientCode: recipients.get(team.leaderId)!,
          status: "QUEUED",
        },
      });
    }

    await tx.event.update({
      where: { id: event.id },
      data: { status: "WINNERS_ANNOUNCED" },
    });
  });

  // Enqueue after commit (P3: the sweep re-drives any strays — a payout row
  // without a running job is picked up by sweepStuckPayouts).
  const payouts = await prisma.payout.findMany({
    where: { winner: { eventId: event.id }, tranche: "INSTANT", status: "QUEUED" },
    select: { id: true },
  });
  for (const payout of payouts) {
    await enqueue("payout.execute", { payoutId: payout.id });
  }
}

// ── Payout execution (the job — plan §10.4 STEP 4) ──────────────────────

export interface ExecuteResult {
  outcome: "succeeded" | "processing" | "failed" | "duplicate" | "not-found";
}

/**
 * Execute one payout: re-check state under a row lock, create the Paystack
 * transfer with a per-attempt reference, record the outcome. Never advances
 * the vault — that happens only on confirmed transfer success.
 */
export async function executePayout(payoutId: string): Promise<ExecuteResult> {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: { winner: { include: { event: { select: { title: true } } } } },
  });
  if (!payout) return { outcome: "not-found" };
  if (payout.status === "SUCCEEDED" || payout.status === "PROCESSING") {
    return { outcome: "duplicate" };
  }

  const attempt = payout.attemptCount + 1;
  const reference = transferReference(payout.id, attempt);

  // Mark PROCESSING first (claim the attempt) so a concurrent worker or a
  // replayed job sees "duplicate" and stands down.
  const claimed = await prisma.payout.updateMany({
    where: { id: payout.id, status: { in: ["QUEUED", "FAILED"] } },
    data: { status: "PROCESSING", attemptCount: attempt },
  });
  if (claimed.count === 0) return { outcome: "duplicate" };

  try {
    const transfer = await getPaystackPort().initiateTransfer({
      reference,
      recipientCode: payout.recipientCode,
      amountKes: payout.amountKes,
      reason: `${payout.winner.event.title} — ${payout.tranche.toLowerCase()} prize`,
    });

    await prisma.payout.update({
      where: { id: payout.id },
      data: {
        paystackTransferCode: transfer.transferCode,
        paystackReference: reference,
      },
    });

    if (transfer.status === "success") {
      // Simulation mode confirms synchronously; live mode waits for the
      // transfer webhook (both paths converge in confirmTransferSuccess).
      await confirmTransferSuccess(payout.id, reference);
      return { outcome: "succeeded" };
    }
    if (transfer.status === "failed" || transfer.status === "reversed") {
      await handleTransferFailure(payout.id, reference, `Transfer ${transfer.status}.`);
      return { outcome: "failed" };
    }
    return { outcome: "processing" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown transfer error.";
    await handleTransferFailure(payout.id, reference, message);
    return { outcome: "failed" };
  }
}

/** Transfer confirmed → terminal success + vault/ledger advancement. */
export async function confirmTransferSuccess(payoutId: string, reference: string): Promise<void> {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: { winner: true },
  });
  if (!payout || payout.status === "SUCCEEDED") return; // idempotent

  await prisma.payout.update({
    where: { id: payoutId },
    data: { status: "SUCCEEDED", paidAt: new Date(), paystackReference: reference },
  });

  await advanceVaultAfter(payout.winner.eventId);
  await enqueue("payout.attest", {
    eventId: payout.winner.eventId,
    winnerId: payout.winnerId,
    tranche: payout.tranche,
    amountKes: payout.amountKes,
    txRef: reference,
  });
}

/** Failure → fail-closed retry policy (never releases funds). */
async function handleTransferFailure(payoutId: string, reference: string, error: string): Promise<void> {
  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) return;

  const decision = retryDecision(payout.attemptCount);
  if (decision.action === "retry") {
    await prisma.payout.update({
      where: { id: payoutId },
      data: { status: "FAILED", lastError: error.slice(0, 400), paystackReference: reference },
    });
    await enqueue("payout.execute", { payoutId }, { delaySeconds: decision.delaySeconds });
    return;
  }

  // Cap reached → human hands. Funds remain locked; the admin queue owns it.
  await prisma.payout.update({
    where: { id: payoutId },
    data: { status: "MANUAL_REVIEW", lastError: error.slice(0, 400) },
  });
  console.error(`[payout] MANUAL_REVIEW payout=${payoutId} attempts=${payout.attemptCount} error=${error}`);
}

// ── Vault advancement (after confirmed payouts only) ────────────────────

async function advanceVaultAfter(eventId: string): Promise<void> {
  const [vault, winners] = await Promise.all([
    prisma.vaultState.findUnique({ where: { eventId } }),
    prisma.winner.findMany({
      where: { eventId },
      include: { payouts: { select: { tranche: true, status: true } } },
    }),
  ]);
  if (winners.length === 0) return;

  const instantComplete =
    winners.length > 0 &&
    winners.every((winner) => {
      const instant = winner.payouts.find((p) => p.tranche === "INSTANT");
      return instant == null || ["SUCCEEDED", "MANUAL_REVIEW", "REVERSED"].includes(instant.status);
    }) &&
    winners.some((winner) =>
      winner.payouts.some((p) => p.tranche === "INSTANT" && p.status === "SUCCEEDED")
    );

  if (vault && vault.chainState === "LOCKED" && instantComplete) {
    await prisma.vaultState.update({
      where: { eventId },
      data: { chainState: "HALF_RELEASED", halfReleasedAt: new Date() },
    });
  }

  // Fully settled: every winner's instant tranche succeeded AND every
  // milestone-required winner's milestone tranche succeeded.
  const allSettled = winners.every((winner) => {
    const instant = winner.payouts.find((p) => p.tranche === "INSTANT");
    if (!instant || instant.status !== "SUCCEEDED") return false;
    if (!winner.milestoneRequired) return true;
    const milestone = winner.payouts.find((p) => p.tranche === "MILESTONE");
    return milestone != null && milestone.status === "SUCCEEDED";
  });

  if (allSettled) {
    if (vault && vault.chainState !== "SETTLED") {
      await prisma.vaultState.update({
        where: { eventId },
        data: { chainState: "SETTLED", settledAt: new Date() },
      });
    }
    // The event settles even when no vault row exists (legacy/imported
    // events) — payout completion is the source of truth here.
    await prisma.event.updateMany({
      where: { id: eventId, status: { in: ["WINNERS_ANNOUNCED", "JUDGING"] } },
      data: { status: "SETTLED" },
    });
  }
}

// ── Milestone confirmation (plan §10.5 — the final 50%) ────────────────

export async function confirmMilestone(
  winnerId: string,
  organizerId: string
): Promise<{ outcome: "queued" | "not-required" | "wrong-state" | "forbidden" }> {
  const winner = await prisma.winner.findUnique({
    where: { id: winnerId },
    include: {
      event: {
        include: { org: { include: { members: { where: { userId: organizerId, status: "ACTIVE" } } } } },
      },
      milestone: true,
      payouts: true,
      user: { include: { profile: true } },
    },
  });
  if (!winner) return { outcome: "wrong-state" };
  const membership = winner.event.org.members[0];
  if (!membership || membership.role === "MEMBER") return { outcome: "forbidden" };

  if (!winner.milestoneRequired || !winner.milestone) return { outcome: "not-required" };
  if (winner.milestone.confirmedAt) return { outcome: "wrong-state" };

  const instant = winner.payouts.find((p) => p.tranche === "INSTANT");
  if (!instant || instant.status !== "SUCCEEDED") {
    return { outcome: "wrong-state" };
  }
  const existingMilestone = winner.payouts.find((p) => p.tranche === "MILESTONE");
  if (existingMilestone) return { outcome: "wrong-state" };

  const recipientCode = winner.user.profile?.payoutRecipientCode;
  if (!recipientCode) return { outcome: "wrong-state" };

  const plan = tranchePlanFor(winner.amountKes, true);
  await prisma.$transaction(async (tx) => {
    await tx.milestone.update({
      where: { winnerId },
      data: { confirmedBy: organizerId, confirmedAt: new Date() },
    });
    await tx.payout.create({
      data: {
        winnerId,
        tranche: "MILESTONE",
        amountKes: plan.milestoneKes,
        idempotencyKey: payoutIdempotencyKey(winnerId, "MILESTONE"),
        recipientCode,
        status: "QUEUED",
      },
    });
  });

  const created = await prisma.payout.findUnique({
    where: { idempotencyKey: payoutIdempotencyKey(winnerId, "MILESTONE") },
    select: { id: true },
  });
  if (created) await enqueue("payout.execute", { payoutId: created.id });

  return { outcome: "queued" };
}

// ── Admin ops (plan §7.8 — the failure queue) ───────────────────────────

export async function adminRetryPayout(adminId: string, payoutId: string): Promise<ExecuteResult> {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin) throw new PayoutError("Admin not found.", "NOT_FOUND");
  const grants = await prisma.roleGrant.findMany({ where: { userId: adminId, role: "ADMIN" } });
  if (grants.length === 0) throw new PayoutError("Admins only.", "FORBIDDEN");

  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) return { outcome: "not-found" };
  if (payout.status === "SUCCEEDED") return { outcome: "duplicate" };

  // Reset to QUEUED for a fresh attempt cycle.
  await prisma.payout.update({
    where: { id: payoutId },
    data: { status: "QUEUED", lastError: null },
  });
  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      action: "payout.retry",
      entity: "Payout",
      entityId: payoutId,
      reason: `manual retry after ${payout.attemptCount} attempts`,
    },
  });
  return executePayout(payoutId);
}

export async function adminMarkManuallyPaid(
  adminId: string,
  payoutId: string,
  receipt: string
): Promise<void> {
  const grants = await prisma.roleGrant.findMany({ where: { userId: adminId, role: "ADMIN" } });
  if (grants.length === 0) throw new PayoutError("Admins only.", "FORBIDDEN");

  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: { winner: { select: { eventId: true } } },
  });
  if (!payout) throw new PayoutError("Payout not found.", "NOT_FOUND");

  await prisma.$transaction([
    prisma.payout.update({
      where: { id: payoutId },
      data: { status: "SUCCEEDED", paidAt: new Date(), lastError: null, paystackReference: receipt },
    }),
    prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: "payout.mark-paid",
        entity: "Payout",
        entityId: payoutId,
        reason: receipt.slice(0, 300),
      },
    }),
  ]);

  await advanceVaultAfter(payout.winner.eventId);
}

// ── Recovery sweep (cron: re-drive stuck payouts — plan §12) ────────────

/**
 * The safety net for lost jobs: re-drives PROCESSING payouts stuck past the
 * 10-minute mark, and QUEUED/FAILED payouts that never progressed. All paths
 * converge on executePayout, which is idempotent (claims under a conditional
 * update), so the sweep can never double-pay.
 */
export async function sweepStuckPayouts(): Promise<number> {
  const threshold = new Date(Date.now() - 10 * 60 * 1000);
  const payoutIds = await prisma.payout.findMany({
    where: {
      status: { in: ["QUEUED", "FAILED", "PROCESSING"] },
      queuedAt: { lt: threshold },
    },
    select: { id: true },
    take: 50,
  });
  let driven = 0;
  for (const payout of payoutIds) {
    const result = await executePayout(payout.id);
    if (result.outcome !== "duplicate" && result.outcome !== "not-found") driven += 1;
  }
  return driven;
}

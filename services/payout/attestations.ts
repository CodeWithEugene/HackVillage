import { prisma } from "@/lib/db";
import { getChainPort } from "@/lib/ports/chain";

/**
 * Payout attestations (plan §11.3): each confirmed payout tranche is recorded
 * on the public ledger via the chain port. Idempotent — one ledger entry per
 * (event, winner, tranche); a replayed webhook or job cannot duplicate it.
 */

async function hasPayoutEntry(
  eventId: string,
  winnerId: string,
  tranche: "INSTANT" | "MILESTONE"
): Promise<boolean> {
  const existing = await prisma.ledgerEntry.findFirst({
    where: {
      eventId,
      type: tranche === "INSTANT" ? "INSTANT_PAYOUT" : "MILESTONE_PAYOUT",
      payload: { path: ["winnerId"], equals: winnerId },
    },
    select: { id: true },
  });
  return existing != null;
}

export async function attestPayout(input: {
  eventId: string;
  winnerId: string;
  tranche: "INSTANT" | "MILESTONE";
  amountKes: number;
  txRef: string;
}): Promise<void> {
  if (await hasPayoutEntry(input.eventId, input.winnerId, input.tranche)) return;

  const winner = await prisma.winner.findUnique({
    where: { id: input.winnerId },
    select: { user: { select: { handle: true } } },
  });
  // The winner (or its event) may be gone — e.g. test cleanup after an
  // at-least-once job was queued. A deleted event has no public ledger to
  // maintain, so this is a clean no-op, not a failure.
  if (!winner) return;

  const attestation = await getChainPort().attest(input.eventId, {
    kind: input.tranche === "INSTANT" ? "instantPayout" : "milestonePayout",
    winner: winner.user.handle,
    amountKes: input.amountKes,
    txRef: input.txRef,
  });

  await prisma.ledgerEntry.create({
    data: {
      eventId: input.eventId,
      type: input.tranche === "INSTANT" ? "INSTANT_PAYOUT" : "MILESTONE_PAYOUT",
      payload: {
        winnerId: input.winnerId,
        winnerHandle: winner.user.handle,
        amountKes: input.amountKes,
        txRef: input.txRef,
      },
      txHash: attestation.txHash,
      blockNumber: attestation.blockNumber,
    },
  }).catch((error: { code?: string; message?: string }) => {
    // FK violation = event deleted between queue and run — same clean no-op.
    if (error.code === "P2003") return;
    throw error;
  });
}

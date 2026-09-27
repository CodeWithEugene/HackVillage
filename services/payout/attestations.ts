import { prisma } from "@/lib/db";
import {
  chainStateReflects,
  getChainPort,
  type ChainPort,
  type IntendedChainState,
} from "@/lib/ports/chain";
import {
  AttestationNotReadyError,
  mirrorTxHash,
  recoverFromStateRevert,
} from "@/services/escrow/attestations";

/**
 * Payout attestations (plan §11.3): each confirmed payout tranche is recorded
 * on the public ledger via the chain port. Idempotent — one ledger entry per
 * (event, winner, tranche); a replayed webhook or job cannot duplicate it.
 *
 * State-aware (audit remediation): the on-chain vault state is read before
 * every write. The PrizeVault contract only accepts each transition once
 * (LOCKED→HALF_RELEASED→SETTLED), so with multiple winners the second instant
 * attestation MUST NOT re-send the write — it mirrors the ledger row instead.
 * When the chain is behind (e.g. the vault-lock attestation hasn't landed),
 * the handler re-throws once wrapped as retryable and pg-boss re-drives it.
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

export async function attestPayout(
  input: {
    eventId: string;
    winnerId: string;
    tranche: "INSTANT" | "MILESTONE";
    amountKes: number;
    txRef: string;
  },
  chain: ChainPort = getChainPort()
): Promise<void> {
  if (await hasPayoutEntry(input.eventId, input.winnerId, input.tranche)) return;

  const winner = await prisma.winner.findUnique({
    where: { id: input.winnerId },
    select: { user: { select: { handle: true } } },
  });
  // The winner (or its event) may be gone — e.g. test cleanup after an
  // at-least-once job was queued. A deleted event has no public ledger to
  // maintain, so this is a clean no-op, not a failure.
  if (!winner) return;

  const intended: IntendedChainState = input.tranche === "INSTANT" ? "HALF_RELEASED" : "SETTLED";
  const onChain = await chain.readVaultState(input.eventId);

  if (chainStateReflects(onChain, intended)) {
    // Already applied on-chain (crash between chain write and DB write, or a
    // prior winner's attestation moved the state machine past this intent) —
    // skip the write, mirror the row (idempotent by txRef-seeded hash).
    console.warn(
      `[attest] vault ${input.eventId} already ${onChain?.state} on-chain — mirroring ${input.tranche} payout row for winner ${input.winnerId}`
    );
    await ensurePayoutEntry(input, winner.user.handle);
    return;
  }

  // The chain must be exactly one step behind for the write to succeed:
  // INSTANT needs LOCKED, MILESTONE needs HALF_RELEASED. Anything earlier
  // (AWAITING/missing vault, or LOCKED for a milestone) means the previous
  // attestation family hasn't landed — retry, never force it.
  const writable =
    onChain != null &&
    ((input.tranche === "INSTANT" && onChain.state === "LOCKED") ||
      (input.tranche === "MILESTONE" && onChain.state === "HALF_RELEASED"));
  const simulationBypass = chain.mode === "simulation" && onChain == null;
  if (!writable && !simulationBypass) {
    throw new AttestationNotReadyError(
      `[attest] vault ${input.eventId} on-chain state ${onChain?.state ?? "missing"} not ready for ${input.tranche} payout attestation — retrying`
    );
  }

  try {
    const attestation = await chain.attest(input.eventId, {
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
  } catch (error) {
    await recoverFromStateRevert(error, input.eventId, intended, () =>
      ensurePayoutEntry(input, winner.user.handle)
    );
  }
}

async function ensurePayoutEntry(
  input: { eventId: string; winnerId: string; tranche: "INSTANT" | "MILESTONE"; amountKes: number; txRef: string },
  winnerHandle: string
): Promise<void> {
  await prisma.ledgerEntry
    .create({
      data: {
        eventId: input.eventId,
        type: input.tranche === "INSTANT" ? "INSTANT_PAYOUT" : "MILESTONE_PAYOUT",
        payload: {
          winnerId: input.winnerId,
          winnerHandle,
          amountKes: input.amountKes,
          txRef: input.txRef,
          mirrored: true,
        },
        txHash: mirrorTxHash(`payout:${input.eventId}:${input.winnerId}:${input.tranche}:${input.txRef}`),
      },
    })
    .catch((error: { code?: string }) => {
      if (error.code === "P2002" || error.code === "P2003") return;
      throw error;
    });
}

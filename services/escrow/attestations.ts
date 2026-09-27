import { createHash } from "node:crypto";

import { prisma } from "@/lib/db";
import {
  chainStateReflects,
  getChainPort,
  type ChainPort,
  type IntendedChainState,
} from "@/lib/ports/chain";

/**
 * Escrow service — on-chain attestations (plan §10.3 STEP 5). The ledger is
 * DERIVED data: the DB transaction has already committed the money state;
 * attestations are idempotent (one LedgerEntry per type per event) and a
 * failing RPC can never block payments (P2, ADR-007 — the chain is the
 * ledger, not the custodian).
 *
 * Every handler is STATE-AWARE (audit remediation): it reads the on-chain
 * vault before writing. When the intended state is already reflected there,
 * the write is skipped and only the missing LedgerEntry mirror is created —
 * a crash between the chain write and the DB write is then fully recoverable.
 */

/** Thrown when the chain is BEHIND the intended state — pg-boss retries. */
export class AttestationNotReadyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttestationNotReadyError";
  }
}

/** Contract revert reasons that signal a state-gate, not a real failure. */
export function isChainStateRevert(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /not awaiting deposit|not locked|not half released|not refundable|already/i.test(
    message
  );
}

/** Deterministic mirror hash for the already-applied path (unique column). */
export function mirrorTxHash(seed: string): string {
  return `0x${createHash("sha256").update(`hv-mirror:${seed}`).digest("hex")}`;
}

async function hasEntry(
  eventId: string,
  type: "VAULT_CREATED" | "DEPOSIT_LOCKED" | "VAULT_REFUNDED"
): Promise<boolean> {
  const existing = await prisma.ledgerEntry.findFirst({
    where: { eventId, type },
    select: { id: true },
  });
  return existing != null;
}

/** Create the on-chain vault for an event (idempotent, state-aware). */
export async function attestVaultCreation(
  eventId: string,
  chain: ChainPort = getChainPort()
): Promise<void> {
  if (await hasEntry(eventId, "VAULT_CREATED")) return;

  const vault = await prisma.vaultState.findUnique({ where: { eventId } });
  if (!vault) return;

  // Cold-start / crash-recovery: the vault may already exist on-chain while
  // the DB never recorded it. Mirror instead of re-creating.
  const onChain = await chain.readVaultState(eventId);
  if (onChain) {
    console.warn(
      `[attest] vault for ${eventId} already exists on-chain (${onChain.state}) — mirroring the ledger row`
    );
    const contractAddress = vault.contractAddress ?? (await chain.vaultAddressFor(eventId));
    await prisma.$transaction([
      prisma.vaultState.update({
        where: { eventId },
        data: contractAddress ? { contractAddress } : {},
      }),
      prisma.ledgerEntry.create({
        data: {
          eventId,
          type: "VAULT_CREATED",
          payload: { amountKes: vault.amountKes, contractAddress },
          txHash: mirrorTxHash(`vault-created:${eventId}`),
        },
      }),
    ]);
    return;
  }

  const attestation = await chain.createVault(eventId, vault.amountKes);

  await prisma.$transaction([
    prisma.vaultState.update({
      where: { eventId },
      data: { contractAddress: attestation.contractAddress, lastTxHash: attestation.txHash },
    }),
    prisma.ledgerEntry.create({
      data: {
        eventId,
        type: "VAULT_CREATED",
        payload: { amountKes: vault.amountKes, contractAddress: attestation.contractAddress },
        txHash: attestation.txHash,
        blockNumber: attestation.blockNumber,
      },
    }),
  ]);
}

/** Attest the locked deposit once the vault flips LOCKED (idempotent). */
export async function attestVaultLocked(
  eventId: string,
  chain: ChainPort = getChainPort()
): Promise<void> {
  if (await hasEntry(eventId, "DEPOSIT_LOCKED")) return;

  const vault = await prisma.vaultState.findUnique({ where: { eventId } });
  // Locked-or-beyond in the DB (REFUNDED included: a refunded vault was
  // locked first — its lock attestation still belongs on the ledger).
  const lockedStates = ["LOCKED", "HALF_RELEASED", "SETTLED", "REFUNDED"];
  if (!vault || !lockedStates.includes(vault.chainState)) return;

  const deposit = await prisma.deposit.findFirst({
    where: { eventId, status: "SUCCEEDED" },
    orderBy: { paidAt: "desc" },
  });
  const paystackRef = deposit?.paystackReference ?? `event-${eventId}`;

  const onChain = await chain.readVaultState(eventId);
  if (chainStateReflects(onChain, "LOCKED")) {
    console.warn(
      `[attest] vault ${eventId} already LOCKED on-chain (${onChain?.state}) — mirroring the ledger row`
    );
    await ensureDepositLockedEntry(eventId, vault.amountKes, paystackRef);
    return;
  }

  try {
    const attestation = await chain.attest(eventId, { kind: "lock", paystackRef });

    await prisma.$transaction([
      prisma.vaultState.update({
        where: { eventId },
        data: { lastTxHash: attestation.txHash },
      }),
      prisma.ledgerEntry.create({
        data: {
          eventId,
          type: "DEPOSIT_LOCKED",
          payload: { amountKes: vault.amountKes, paystackRef },
          txHash: attestation.txHash,
          blockNumber: attestation.blockNumber,
        },
      }),
    ]);
  } catch (error) {
    await recoverFromStateRevert(error, eventId, "LOCKED", () =>
      ensureDepositLockedEntry(eventId, vault.amountKes, paystackRef)
    );
  }
}

/** Attest a vault refund once the DB vault flips REFUNDED (idempotent). */
export async function attestRefund(
  eventId: string,
  refundRef: string,
  chain: ChainPort = getChainPort()
): Promise<void> {
  if (await hasEntry(eventId, "VAULT_REFUNDED")) return;

  const vault = await prisma.vaultState.findUnique({ where: { eventId } });
  if (!vault) return;

  const onChain = await chain.readVaultState(eventId);
  if (chainStateReflects(onChain, "REFUNDED")) {
    console.warn(`[attest] vault ${eventId} already REFUNDED on-chain — mirroring the ledger row`);
    await ensureRefundedEntry(eventId, refundRef);
    return;
  }
  if (!onChain || (onChain.state !== "LOCKED" && onChain.state !== "HALF_RELEASED")) {
    throw new AttestationNotReadyError(
      `[attest] vault ${eventId} on-chain state ${onChain?.state ?? "missing"} is not refundable yet — retrying`
    );
  }

  try {
    const attestation = await chain.attest(eventId, { kind: "refund", refundRef });
    await prisma.$transaction([
      prisma.vaultState.update({
        where: { eventId },
        data: { lastTxHash: attestation.txHash },
      }),
      prisma.ledgerEntry.create({
        data: {
          eventId,
          type: "VAULT_REFUNDED",
          payload: { refundRef },
          txHash: attestation.txHash,
          blockNumber: attestation.blockNumber,
        },
      }),
    ]);
  } catch (error) {
    await recoverFromStateRevert(error, eventId, "REFUNDED", () =>
      ensureRefundedEntry(eventId, refundRef)
    );
  }
}

/**
 * Shared revert recovery: a state-gate revert means either the intended state
 * already landed (already-applied — mirror the ledger row and log loudly) or
 * the chain is behind (re-throw once, wrapped as retryable for pg-boss).
 */
export async function recoverFromStateRevert(
  error: unknown,
  eventId: string,
  intended: IntendedChainState,
  ensureRow: () => Promise<void>,
  chain: ChainPort = getChainPort()
): Promise<void> {
  if (!isChainStateRevert(error)) throw error;
  const onChain = await chain.readVaultState(eventId).catch(() => null);
  if (chainStateReflects(onChain, intended)) {
    console.warn(
      `[attest] vault ${eventId} reverted with "${error instanceof Error ? error.message : String(error)}" but on-chain state ${onChain?.state} already reflects ${intended} — treating as applied`
    );
    await ensureRow();
    return;
  }
  throw new AttestationNotReadyError(
    `[attest] vault ${eventId} not ready for ${intended} (on-chain: ${onChain?.state ?? "missing"}): ${
      error instanceof Error ? error.message : String(error)
    }`
  );
}

async function ensureDepositLockedEntry(
  eventId: string,
  amountKes: number,
  paystackRef: string
): Promise<void> {
  await prisma.ledgerEntry
    .create({
      data: {
        eventId,
        type: "DEPOSIT_LOCKED",
        payload: { amountKes, paystackRef, mirrored: true },
        txHash: mirrorTxHash(`deposit-locked:${eventId}:${paystackRef}`),
      },
    })
    .catch((error: { code?: string }) => {
      if (error.code === "P2002") return; // mirror row already exists
      throw error;
    });
}

async function ensureRefundedEntry(eventId: string, refundRef: string): Promise<void> {
  await prisma.ledgerEntry
    .create({
      data: {
        eventId,
        type: "VAULT_REFUNDED",
        payload: { refundRef, mirrored: true },
        txHash: mirrorTxHash(`refunded:${eventId}:${refundRef}`),
      },
    })
    .catch((error: { code?: string }) => {
      if (error.code === "P2002") return;
      throw error;
    });
}

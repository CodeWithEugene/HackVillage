import { prisma } from "@/lib/db";
import { getChainPort } from "@/lib/ports/chain";

/**
 * Escrow service — on-chain attestations (plan §10.3 STEP 5). The ledger is
 * DERIVED data: the DB transaction has already committed the money state;
 * attestations are idempotent (one LedgerEntry per type per event) and a
 * failing RPC can never block payments (P2, ADR-007 — the chain is the
 * ledger, not the custodian).
 */

async function hasEntry(eventId: string, type: "VAULT_CREATED" | "DEPOSIT_LOCKED"): Promise<boolean> {
  const existing = await prisma.ledgerEntry.findFirst({
    where: { eventId, type },
    select: { id: true },
  });
  return existing != null;
}

/** Create the on-chain vault for an event (idempotent). */
export async function attestVaultCreation(eventId: string): Promise<void> {
  if (await hasEntry(eventId, "VAULT_CREATED")) return;

  const vault = await prisma.vaultState.findUnique({ where: { eventId } });
  if (!vault) return;

  const attestation = await getChainPort().createVault(eventId, vault.amountKes);

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
export async function attestVaultLocked(eventId: string): Promise<void> {
  if (await hasEntry(eventId, "DEPOSIT_LOCKED")) return;

  const vault = await prisma.vaultState.findUnique({ where: { eventId } });
  if (!vault || vault.chainState !== "LOCKED") return;

  const deposit = await prisma.deposit.findFirst({
    where: { eventId, status: "SUCCEEDED" },
    orderBy: { paidAt: "desc" },
  });
  const paystackRef = deposit?.paystackReference ?? `event-${eventId}`;

  const attestation = await getChainPort().attest(eventId, { kind: "lock", paystackRef });

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
}

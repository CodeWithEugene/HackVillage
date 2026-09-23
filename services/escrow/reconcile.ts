import { prisma } from "@/lib/db";

/**
 * Ledger reconciliation (plan §11.3, §12 — the nightly job): a three-way
 * match between DB money state, ledger entries, and (in chain mode) the
 * on-chain attestations. In simulation mode the chain leg is skipped and
 * the DB ↔ ledger match is the contract. Mismatches are REPORTED, never
 * auto-repaired — reconciliation findings go to a human.
 */

export interface ReconciliationFinding {
  kind: "vault-missing-entry" | "vault-state-mismatch" | "payout-missing-entry" | "extra-ledger-entry";
  eventId: string;
  detail: string;
}

export async function reconcileLedger(): Promise<{
  checkedEvents: number;
  checkedPayouts: number;
  findings: ReconciliationFinding[];
}> {
  const findings: ReconciliationFinding[] = [];

  // 1. Every LOCKED-or-beyond vault has a DEPOSIT_LOCKED entry.
  const vaults = await prisma.vaultState.findMany({
    where: { chainState: { in: ["LOCKED", "HALF_RELEASED", "SETTLED"] } },
    select: { eventId: true, chainState: true },
  });
  for (const vault of vaults) {
    const hasLockEntry = await prisma.ledgerEntry.findFirst({
      where: { eventId: vault.eventId, type: "DEPOSIT_LOCKED" },
      select: { id: true },
    });
    if (!hasLockEntry) {
      findings.push({
        kind: "vault-missing-entry",
        eventId: vault.eventId,
        detail: `Vault is ${vault.chainState} but no DEPOSIT_LOCKED ledger entry exists.`,
      });
    }
  }

  // 2. Vault HALF_RELEASED/SETTLED implies at least one INSTANT_PAYOUT entry.
  const released = vaults.filter((v) => v.chainState !== "LOCKED");
  for (const vault of released) {
    const hasPayoutEntry = await prisma.ledgerEntry.findFirst({
      where: { eventId: vault.eventId, type: "INSTANT_PAYOUT" },
      select: { id: true },
    });
    if (!hasPayoutEntry) {
      findings.push({
        kind: "vault-missing-entry",
        eventId: vault.eventId,
        detail: `Vault is ${vault.chainState} but no INSTANT_PAYOUT ledger entry exists.`,
      });
    }
  }

  // 3. Every SUCCEEDED payout has its ledger entry (per winner+tranche).
  const payouts = await prisma.payout.findMany({
    where: { status: "SUCCEEDED" },
    select: {
      id: true,
      winnerId: true,
      tranche: true,
      amountKes: true,
      winner: { select: { eventId: true } },
    },
  });
  for (const payout of payouts) {
    const entry = await prisma.ledgerEntry.findFirst({
      where: {
        eventId: payout.winner.eventId,
        type: payout.tranche === "INSTANT" ? "INSTANT_PAYOUT" : "MILESTONE_PAYOUT",
        payload: { path: ["winnerId"], equals: payout.winnerId },
      },
      select: { id: true },
    });
    if (!entry) {
      findings.push({
        kind: "payout-missing-entry",
        eventId: payout.winner.eventId,
        detail: `Payout ${payout.id} (${payout.tranche}, ${payout.amountKes} KES) SUCCEEDED with no ledger entry.`,
      });
    }
  }

  // 4. Ledger payout entries without a SUCCEEDED payout (extra/ghost).
  const payoutEntries = await prisma.ledgerEntry.findMany({
    where: { type: { in: ["INSTANT_PAYOUT", "MILESTONE_PAYOUT"] } },
    select: { id: true, eventId: true, payload: true, type: true },
  });
  for (const entry of payoutEntries) {
    const winnerId = (entry.payload as Record<string, unknown>)?.winnerId as string | undefined;
    if (!winnerId) continue;
    const payout = await prisma.payout.findFirst({
      where: { winnerId, tranche: entry.type === "INSTANT_PAYOUT" ? "INSTANT" : "MILESTONE" },
      select: { status: true },
    });
    if (!payout || payout.status !== "SUCCEEDED") {
      findings.push({
        kind: "extra-ledger-entry",
        eventId: entry.eventId,
        detail: `Ledger entry ${entry.id} (${entry.type}) has no SUCCEEDED payout for winner ${winnerId}.`,
      });
    }
  }

  return {
    checkedEvents: vaults.length,
    checkedPayouts: payouts.length,
    findings,
  };
}

import { prisma } from "@/lib/db";
import { chainStateReflects, getChainPort, type ChainPort } from "@/lib/ports/chain";
import { enqueue } from "@/lib/queue";

/**
 * Ledger reconciliation (plan §11.3, §12 — the nightly job): a three-way
 * match between DB money state, ledger entries, and (in amoy chain mode) the
 * on-chain vault truth. DB ↔ ledger mismatches are REPORTED, never
 * auto-repaired. Chain-leg mismatches where the chain is BEHIND the DB are
 * auto-repaired by re-enqueueing the missing attestation jobs (the handlers
 * are state-aware and idempotent) AND reported; a chain AHEAD of the DB is
 * report-only — a human investigates. In simulation mode the chain leg is
 * skipped and the report says so.
 */

export interface ReconciliationFinding {
  kind:
    | "vault-missing-entry"
    | "vault-state-mismatch"
    | "payout-missing-entry"
    | "extra-ledger-entry"
    | "chain-state-mismatch"
    | "chain-released-mismatch";
  eventId: string;
  detail: string;
}

export interface ReconciliationReport {
  checkedEvents: number;
  checkedPayouts: number;
  findings: ReconciliationFinding[];
  /// "ran" compares on-chain truth; "skipped-simulation" when no RPC is wired.
  chainLeg: "ran" | "skipped-simulation";
  /// Count of attestation jobs re-enqueued by the auto-repair chain leg.
  autoRepairs: number;
}

export async function reconcileLedger(chainOverride?: ChainPort): Promise<ReconciliationReport> {
  const findings: ReconciliationFinding[] = [];
  let autoRepairs = 0;

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
      paystackReference: true,
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

  // 4. Ledger payout entries without a live payout (extra/ghost). A REVERSED
  //    payout legitimately keeps its entry — the entry records a transfer
  //    that succeeded before the clawback; flagging it is a false positive.
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
    if (!payout || (payout.status !== "SUCCEEDED" && payout.status !== "REVERSED")) {
      findings.push({
        kind: "extra-ledger-entry",
        eventId: entry.eventId,
        detail: `Ledger entry ${entry.id} (${entry.type}) has no live payout for winner ${winnerId} (status ${payout?.status ?? "missing"}).`,
      });
    }
  }

  // 5. Chain leg (amoy only): on-chain truth vs DB state. The chain being
  //    BEHIND auto-repairs via state-aware attestation jobs; AHEAD is
  //    report-only. Simulation mode has no chain truth — skipped, and the
  //    report says so.
  const chain = chainOverride ?? getChainPort();
  const chainLeg: ReconciliationReport["chainLeg"] = chain.mode === "amoy" ? "ran" : "skipped-simulation";
  if (chainLeg === "ran") {
    for (const vault of vaults) {
      const onChain = await chain.readVaultState(vault.eventId).catch(() => null);
      if (!onChain) {
        findings.push({
          kind: "chain-state-mismatch",
          eventId: vault.eventId,
          detail: `DB vault is ${vault.chainState} but no vault exists on-chain. Re-enqueued vault creation.`,
        });
        await enqueue(
          "escrow.attest-vault-created",
          { eventId: vault.eventId },
          { retryLimit: 10, expireInSeconds: 3600 }
        );
        autoRepairs += 1;
        continue;
      }

      // Chain AHEAD of the DB (incl. an on-chain refund the DB never saw):
      // report-only — the DB is the operational truth, a human investigates.
      if (onChain.state === "REFUNDED" && vault.chainState !== "REFUNDED") {
        findings.push({
          kind: "vault-state-mismatch",
          eventId: vault.eventId,
          detail: `On-chain vault is REFUNDED but DB vault is ${vault.chainState}. Investigate before any payout.`,
        });
      } else {
        const order = ["AWAITING", "LOCKED", "HALF_RELEASED", "SETTLED"];
        if (order.indexOf(onChain.state) > order.indexOf(vault.chainState)) {
          findings.push({
            kind: "vault-state-mismatch",
            eventId: vault.eventId,
            detail: `On-chain state ${onChain.state} is ahead of DB vault ${vault.chainState}. Investigate.`,
          });
        }
      }

      // Lock leg: the chain must reflect LOCKED for any DB locked-or-beyond vault.
      if (!chainStateReflects(onChain, "LOCKED")) {
        findings.push({
          kind: "chain-state-mismatch",
          eventId: vault.eventId,
          detail: `DB vault is ${vault.chainState} but on-chain state is ${onChain.state}. Re-enqueued lock attestation.`,
        });
        await enqueue(
          "escrow.attest-vault-locked",
          { eventId: vault.eventId },
          { retryLimit: 10, expireInSeconds: 3600 }
        );
        autoRepairs += 1;
      }

      // Payout legs: every SUCCEEDED payout whose intended state is not yet
      // reflected on-chain gets its attestation re-enqueued.
      const eventPayouts = payouts.filter((p) => p.winner.eventId === vault.eventId);
      for (const payout of eventPayouts) {
        const intended = payout.tranche === "INSTANT" ? "HALF_RELEASED" : "SETTLED";
        if (chainStateReflects(onChain, intended)) continue;
        findings.push({
          kind: "chain-state-mismatch",
          eventId: vault.eventId,
          detail: `On-chain state ${onChain.state} is behind DB for payout ${payout.id} (${payout.tranche}). Re-enqueued attestation.`,
        });
        await enqueue(
          "payout.attest",
          {
            eventId: payout.winner.eventId,
            winnerId: payout.winnerId,
            tranche: payout.tranche,
            amountKes: payout.amountKes,
            txRef: payout.paystackReference ?? payout.id,
          },
          { retryLimit: 10, expireInSeconds: 3600 }
        );
        autoRepairs += 1;
      }

      // Released amount truth: Σ attested payout amounts must equal on-chain releasedKes.
      const entries = await prisma.ledgerEntry.findMany({
        where: { eventId: vault.eventId, type: { in: ["INSTANT_PAYOUT", "MILESTONE_PAYOUT"] } },
        select: { payload: true },
      });
      const dbReleased = entries.reduce((sum, entry) => {
        const amount = (entry.payload as Record<string, unknown>)?.amountKes;
        return sum + (typeof amount === "number" ? amount : 0);
      }, 0);
      if (onChain.releasedKes !== dbReleased) {
        findings.push({
          kind: "chain-released-mismatch",
          eventId: vault.eventId,
          detail: `On-chain releasedKes ${onChain.releasedKes} ≠ Σ ledger payout entries ${dbReleased} KES.`,
        });
      }
    }
  }

  return {
    checkedEvents: vaults.length,
    checkedPayouts: payouts.length,
    findings,
    chainLeg,
    autoRepairs,
  };
}

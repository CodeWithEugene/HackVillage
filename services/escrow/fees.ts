/**
 * Escrow deposit math (pure — unit-tested). ADR-012: the organizer deposits
 * gross = pool portion × (1 + fee); the vault records the pool portion only.
 */

export interface DepositPlan {
  grossAmountKes: number;
  poolAmountKes: number;
  feeKes: number;
}

export function depositPlanForPool(
  remainingPoolKes: number,
  feeBps: number
): DepositPlan {
  if (remainingPoolKes <= 0) {
    throw new Error("Deposit math requires a positive remaining pool.");
  }
  const gross = Math.round(remainingPoolKes * (1 + feeBps / 10_000));
  return {
    grossAmountKes: gross,
    poolAmountKes: remainingPoolKes,
    feeKes: gross - remainingPoolKes,
  };
}

/** True once succeeded deposit pool portions cover the declared pool. */
export function poolCovered(succeededPoolAmounts: number[], declaredPoolKes: number): boolean {
  return succeededPoolAmounts.reduce((sum, amount) => sum + amount, 0) >= declaredPoolKes;
}

/** HV-<short>-<random> — the Paystack transaction reference (idempotency anchor). */
export function depositReference(eventId: string, randomHex: string): string {
  const short = eventId.replace(/[^a-z0-9]/gi, "").slice(-8).toLowerCase();
  return `hv-${short}-${randomHex.toLowerCase()}`;
}

/** Deposits may be split — always initiated for the REMAINING pool. */
export function remainingPoolKes(declaredPoolKes: number, succeededPoolKes: number): number {
  return Math.max(0, declaredPoolKes - succeededPoolKes);
}

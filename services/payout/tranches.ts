/**
 * Payout domain — pure functions (Phase 5). Tranche math per the Instant
 * Reward Protocol: 50% at win, 50% at milestone (plan §10.4–10.5, ADR-013).
 */

export const INSTANT_SHARE = 0.5;

export interface TranchePlan {
  instantKes: number;
  milestoneKes: number;
}

/**
 * The 50/50 split, integer-safe: rounding residue always lands on the
 * INSTANT tranche so the two tranches sum back to the full prize exactly.
 */
export function tranchePlanFor(amountKes: number, milestoneRequired: boolean): TranchePlan {
  if (amountKes <= 0) throw new Error("Tranche math requires a positive prize.");
  if (!milestoneRequired) {
    // No milestone → the full prize pays on the day, single tranche.
    return { instantKes: amountKes, milestoneKes: 0 };
  }
  const instant = Math.ceil(amountKes * INSTANT_SHARE);
  return { instantKes: instant, milestoneKes: amountKes - instant };
}

/** ⬤ The structural idempotency key (schema-enforced unique). */
export function payoutIdempotencyKey(winnerId: string, tranche: "INSTANT" | "MILESTONE"): string {
  return `${winnerId}:${tranche}`;
}

/** Paystack transfer reference — unique per payout attempt series. */
export function transferReference(payoutId: string, attempt: number): string {
  return `trf-${payoutId.toLowerCase()}-${attempt}`;
}

export const MAX_PAYOUT_ATTEMPTS = 5;
export const RETRY_BACKOFF_SECONDS = 60;

/** The retry policy (plan §10.4): backoff until the cap, then MANUAL_REVIEW. */
export function retryDecision(
  attemptCount: number
): { action: "retry"; delaySeconds: number } | { action: "manual_review" } {
  if (attemptCount >= MAX_PAYOUT_ATTEMPTS) return { action: "manual_review" };
  // Exponential-ish: 1min, 2min, 4min, 8min — capped inside the 30-min budget.
  const delay = Math.min(RETRY_BACKOFF_SECONDS * 2 ** (attemptCount - 1), 1800);
  return { action: "retry", delaySeconds: delay };
}

/**
 * Trust Score KPI (plan §2.4): the fraction of prizes disbursed (instant
 * tranche) within one hour of the winners announcement.
 */
export function trustScoreForWindow(
  payouts: { paidAt: Date | null; queuedAt: Date }[],
  announcedAt: Date,
  now: Date = new Date()
): { withinWindow: number; total: number; trustScore: number } {
  const eligible = payouts.filter((payout) => payout.queuedAt >= announcedAt);
  const total = eligible.length;
  if (total === 0) return { withinWindow: 0, total: 0, trustScore: 1 };
  const withinWindow = eligible.filter(
    (payout) => payout.paidAt != null && payout.paidAt.getTime() - announcedAt.getTime() <= 3_600_000
  ).length;
  void now;
  return { withinWindow, total, trustScore: withinWindow / total };
}

/** All instant payouts for the event succeeded (or closed manually)? */
export function instantTranchesComplete(
  payouts: { status: string }[]
): boolean {
  return payouts.every((payout) =>
    ["SUCCEEDED", "MANUAL_REVIEW", "REVERSED"].includes(payout.status)
  );
}

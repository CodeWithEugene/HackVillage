/**
 * Trust score math (pure — unit-tested). Score = 100 + Σ TrustEvents,
 * floored at 0, capped at 100 + MAX_BONUS.
 */

export const TRUST_BASE = 100;
export const MAX_TRUST_SCORE = 150;

/** Apply a delta with floor/cap. */
export function trustScoreFrom(current: number, delta: number): number {
  return Math.max(0, Math.min(MAX_TRUST_SCORE, current + delta));
}

/** The media deadline: endsAt + 48h (plan §10.6). */
export function mediaDeadlineFor(endsAt: Date): Date {
  return new Date(endsAt.getTime() + 48 * 60 * 60 * 1000);
}

export const MEDIA_PENALTY_DELTA = -10;

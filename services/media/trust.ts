/**
 * Trust score math (pure — unit-tested). Score = TRUST_BASE + Σ TrustEvents,
 * floored at 0, capped at MAX_TRUST_SCORE.
 */

/** The score every organization starts at (mirrors the schema default). */
export const TRUST_BASE = 100;
export const MAX_TRUST_SCORE = 150;

/** Apply a delta with floor/cap. */
export function trustScoreFrom(current: number, delta: number): number {
  return Math.max(0, Math.min(MAX_TRUST_SCORE, current + delta));
}

// The 48h media deadline lives in lib/events/lifecycle.ts (lib owns event
// timing; services may import lib, never the reverse). Re-exported here so
// existing media-side imports keep working.
export { mediaDeadlineFor } from "@/lib/events/lifecycle";

export const MEDIA_PENALTY_DELTA = -10;

/**
 * Session lifetime policy, set from NIST SP 800-63B-4 reauthentication rules:
 * - Every signed-in account controls money (payout destinations, organizer
 *   deposits), so all accounts get the AAL2 limits: 1 hour of inactivity,
 *   24 hours overall (§2.2.3).
 * - Admins operate the whole platform, so they get the AAL3 limits:
 *   15 minutes of inactivity, 12 hours overall (§2.3.3).
 * After either limit the user signs in again.
 */

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export interface SessionLimits {
  idleMs: number;
  absoluteMs: number;
}

export const STANDARD_SESSION_LIMITS: SessionLimits = { idleMs: HOUR_MS, absoluteMs: 24 * HOUR_MS };
export const ADMIN_SESSION_LIMITS: SessionLimits = { idleMs: 15 * MINUTE_MS, absoluteMs: 12 * HOUR_MS };

/** The longest idle window any session can have: the session cookie's lifetime. */
export const MAX_IDLE_SECONDS = STANDARD_SESSION_LIMITS.idleMs / 1000;

export function sessionLimitsFor(roles: readonly string[]): SessionLimits {
  return roles.includes("ADMIN") ? ADMIN_SESSION_LIMITS : STANDARD_SESSION_LIMITS;
}

export type SessionAge = "active" | "idle" | "expired";

/**
 * Where a session stands. `authTime` is when the user last signed in,
 * `lastActive` when they last made a request. Tokens from before this policy
 * carry neither and count as expired: only a fresh sign-in records them.
 */
export function sessionAge(
  token: { authTime?: number; lastActive?: number },
  limits: SessionLimits,
  now: number
): SessionAge {
  if (typeof token.authTime !== "number" || typeof token.lastActive !== "number") return "expired";
  if (now - token.authTime > limits.absoluteMs) return "expired";
  if (now - token.lastActive > limits.idleMs) return "idle";
  return "active";
}

/**
 * Minimal in-memory fixed-window rate limiter for auth actions (Phase 1).
 * Per-process only — the single-instance deployment makes this adequate for
 * v1; swap for a shared store (e.g. Upstash) when the app scales out.
 */

interface WindowState {
  count: number;
  resetAt: number;
}

const windows = new Map<string, WindowState>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  const state = windows.get(key);
  if (!state || state.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  if (state.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((state.resetAt - now) / 1000),
    };
  }
  state.count += 1;
  return { ok: true, remaining: limit - state.count, retryAfterSeconds: 0 };
}

/** Test helper — clears all windows. */
export function resetRateLimits(): void {
  windows.clear();
}

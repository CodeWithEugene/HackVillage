import { prisma } from "@/lib/db";

/**
 * Fixed-window rate limiter backed by the RateLimitBucket table, so limits
 * hold across serverless instances and restarts (audit: the in-memory map let
 * every instance hand out a fresh allowance). The database row is updated
 * with a single atomic upsert — concurrent calls serialize on the row lock.
 *
 * Availability over strictness: on ANY database error the limiter falls back
 * to the per-process in-memory map (and logs). A flaky database must never
 * take sign-in down with it; the window math below is identical in both
 * stores, so behavior only degrades to per-process scope.
 */

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface WindowState {
  count: number;
  resetAt: number;
}

const fallbackWindows = new Map<string, WindowState>();

function rateLimitInMemory(
  key: string,
  limit: number,
  windowMs: number,
  now: number
): RateLimitResult {
  const state = fallbackWindows.get(key);
  if (!state || state.resetAt <= now) {
    fallbackWindows.set(key, { count: 1, resetAt: now + windowMs });
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

interface BucketRow {
  count: number;
  resetAt: Date;
}

async function rateLimitInDb(
  key: string,
  limit: number,
  windowMs: number,
  now: number
): Promise<RateLimitResult> {
  const rows = await prisma.$queryRaw<BucketRow[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${new Date(now + windowMs)})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."resetAt" <= ${new Date(now)}
        THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= ${new Date(now)}
        THEN ${new Date(now + windowMs)} ELSE "RateLimitBucket"."resetAt" END
    RETURNING "count", "resetAt"
  `;
  const bucket = rows[0];
  if (!bucket) {
    // RETURNING never yields zero rows on Postgres; guard anyway and treat as
    // a fresh window rather than blocking a legitimate caller.
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(0, Math.ceil((bucket.resetAt.getTime() - now) / 1000)),
    };
  }
  return { ok: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): Promise<RateLimitResult> {
  try {
    return await rateLimitInDb(key, limit, windowMs, now);
  } catch (error) {
    console.error("[rate-limit] DB unavailable — falling back to in-memory window", error);
    return rateLimitInMemory(key, limit, windowMs, now);
  }
}

/** Test helper — clears both the durable buckets and the fallback windows. */
export async function resetRateLimits(): Promise<void> {
  fallbackWindows.clear();
  try {
    await prisma.rateLimitBucket.deleteMany();
  } catch (error) {
    console.error("[rate-limit] DB unavailable — cleared in-memory windows only", error);
  }
}

import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { purgeExpiredRateLimits, rateLimit, resetRateLimits } from "@/lib/rate-limit";

/** True when the durable bucket table is reachable (CI/dev DATABASE_URL). */
async function dbAvailable(): Promise<boolean> {
  try {
    await prisma.rateLimitBucket.count();
    return true;
  } catch {
    return false;
  }
}

describe("rateLimit", () => {
  it("allows up to the limit inside a window", async () => {
    await resetRateLimits();
    expect((await rateLimit("k", 3, 1000)).ok).toBe(true);
    expect((await rateLimit("k", 3, 1000)).ok).toBe(true);
    expect((await rateLimit("k", 3, 1000)).ok).toBe(true);
  });

  it("blocks past the limit and reports retry time", async () => {
    await resetRateLimits();
    for (let i = 0; i < 2; i += 1) await rateLimit("j", 2, 1000);
    const result = await rateLimit("j", 2, 1000);
    expect(result.ok).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks keys independently", async () => {
    await resetRateLimits();
    await rateLimit("a", 1, 1000);
    expect((await rateLimit("a", 1, 1000)).ok).toBe(false);
    expect((await rateLimit("b", 1, 1000)).ok).toBe(true);
  });

  it("resets once the window has elapsed", async () => {
    await resetRateLimits();
    const now = Date.now();
    expect((await rateLimit("d", 1, 1000, now)).ok).toBe(true); // fills the window
    expect((await rateLimit("d", 1, 1000, now)).ok).toBe(false); // blocked inside it
    expect((await rateLimit("d", 1, 1000, now + 2000)).ok).toBe(true); // fresh window
  });

  it("persists buckets in the database (survives process-local state)", async () => {
    if (!(await dbAvailable())) return;
    await resetRateLimits();
    const before = Date.now();
    await rateLimit("db-persist", 5, 60_000);
    const row = await prisma.rateLimitBucket.findUnique({ where: { key: "db-persist" } });
    expect(row).not.toBeNull();
    expect(row?.count).toBe(1);
    expect(row?.resetAt.getTime()).toBeGreaterThanOrEqual(before + 60_000);
  });

  it("resetRateLimits clears the durable store too", async () => {
    if (!(await dbAvailable())) return;
    await rateLimit("db-reset", 5, 60_000);
    await resetRateLimits();
    expect(await prisma.rateLimitBucket.count()).toBe(0);
    // After the reset the key gets a full fresh allowance.
    const result = await rateLimit("db-reset", 1, 60_000);
    expect(result.ok).toBe(true);
    await resetRateLimits();
  });

  it("purgeExpiredRateLimits drops only buckets whose window has ended", async () => {
    if (!(await dbAvailable())) return;
    await resetRateLimits();
    const now = Date.now();
    await rateLimit("db-expired", 5, 1000, now - 10_000); // window ended 9s ago
    await rateLimit("db-live", 5, 60_000, now);
    expect(await purgeExpiredRateLimits(now)).toBe(1);
    const keys = (await prisma.rateLimitBucket.findMany({ select: { key: true } })).map((b) => b.key);
    expect(keys).toEqual(["db-live"]);
    // The live bucket keeps its count.
    expect((await rateLimit("db-live", 2, 60_000, now)).ok).toBe(true);
    expect((await rateLimit("db-live", 2, 60_000, now)).ok).toBe(false);
    await resetRateLimits();
  });
});

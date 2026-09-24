import { describe, expect, it } from "vitest";

import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows up to the limit inside a window", () => {
    resetRateLimits();
    expect(rateLimit("k", 3, 1000).ok).toBe(true);
    expect(rateLimit("k", 3, 1000).ok).toBe(true);
    expect(rateLimit("k", 3, 1000).ok).toBe(true);
  });

  it("blocks past the limit and reports retry time", () => {
    resetRateLimits();
    for (let i = 0; i < 2; i += 1) rateLimit("j", 2, 1000);
    const result = rateLimit("j", 2, 1000);
    expect(result.ok).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks keys independently", () => {
    resetRateLimits();
    rateLimit("a", 1, 1000);
    expect(rateLimit("a", 1, 1000).ok).toBe(false);
    expect(rateLimit("b", 1, 1000).ok).toBe(true);
  });

  it("resets once the window has elapsed", () => {
    resetRateLimits();
    const now = Date.now();
    expect(rateLimit("d", 1, 1000, now).ok).toBe(true); // fills the window
    expect(rateLimit("d", 1, 1000, now).ok).toBe(false); // blocked inside it
    expect(rateLimit("d", 1, 1000, now + 2000).ok).toBe(true); // fresh window
  });
});

import { describe, expect, it } from "vitest";

import {
  instantTranchesComplete,
  payoutIdempotencyKey,
  retryDecision,
  transferReference,
  tranchePlanFor,
  trustScoreForWindow,
  MAX_PAYOUT_ATTEMPTS,
} from "@/services/payout/tranches";

describe("tranche math (Instant Reward Protocol)", () => {
  it("splits 50/50 with rounding residue on the instant tranche", () => {
    expect(tranchePlanFor(500_000, true)).toEqual({
      instantKes: 250_000,
      milestoneKes: 250_000,
    });
    expect(tranchePlanFor(100_001, true)).toEqual({
      instantKes: 50_001,
      milestoneKes: 50_000,
    });
  });

  it("tranches always sum back to the exact prize", () => {
    for (const amount of [10_000, 99_999, 123_457, 1_000_000]) {
      const plan = tranchePlanFor(amount, true);
      expect(plan.instantKes + plan.milestoneKes).toBe(amount);
    }
  });

  it("pays the full prize instantly when no milestone is required", () => {
    expect(tranchePlanFor(80_000, false)).toEqual({ instantKes: 80_000, milestoneKes: 0 });
  });

  it("rejects non-positive prizes", () => {
    expect(() => tranchePlanFor(0, true)).toThrow();
    expect(() => tranchePlanFor(-5, true)).toThrow();
  });
});

describe("idempotency keys (P3 — structural)", () => {
  it("derives from winner + tranche only", () => {
    expect(payoutIdempotencyKey("w1", "INSTANT")).toBe("w1:INSTANT");
    expect(payoutIdempotencyKey("w1", "MILESTONE")).toBe("w1:MILESTONE");
    expect(payoutIdempotencyKey("w2", "INSTANT")).not.toBe(payoutIdempotencyKey("w1", "INSTANT"));
  });

  it("transfer references vary per attempt (retries get fresh references)", () => {
    expect(transferReference("P1", 1)).toBe("trf-p1-1");
    expect(transferReference("P1", 2)).not.toBe(transferReference("P1", 1));
  });
});

describe("retry policy", () => {
  it("retries with growing backoff until the cap, then MANUAL_REVIEW", () => {
    expect(retryDecision(1)).toEqual({ action: "retry", delaySeconds: 60 });
    expect(retryDecision(2)).toEqual({ action: "retry", delaySeconds: 120 });
    expect(retryDecision(3)).toEqual({ action: "retry", delaySeconds: 240 });
    expect(retryDecision(MAX_PAYOUT_ATTEMPTS)).toEqual({ action: "manual_review" });
  });
});

describe("trust KPI window (1 hour)", () => {
  const announced = new Date("2026-06-01T12:00:00Z");

  it("counts only instant payouts made within the hour", () => {
    const result = trustScoreForWindow(
      [
        { paidAt: new Date("2026-06-01T12:30:00Z"), queuedAt: announced }, // in
        { paidAt: new Date("2026-06-01T14:00:00Z"), queuedAt: announced }, // late
        { paidAt: null, queuedAt: announced }, // unpaid
      ],
      announced
    );
    expect(result).toEqual({ withinWindow: 1, total: 3, trustScore: 1 / 3 });
  });

  it("returns a perfect score when there is nothing to measure", () => {
    expect(trustScoreForWindow([], announced)).toEqual({ withinWindow: 0, total: 0, trustScore: 1 });
  });
});

describe("vault transition readiness", () => {
  it("instant tranches complete only when every payout reached a terminal state", () => {
    expect(instantTranchesComplete([{ status: "SUCCEEDED" }, { status: "SUCCEEDED" }])).toBe(true);
    expect(instantTranchesComplete([{ status: "SUCCEEDED" }, { status: "PROCESSING" }])).toBe(false);
    expect(instantTranchesComplete([{ status: "SUCCEEDED" }, { status: "MANUAL_REVIEW" }])).toBe(
      true
    );
    expect(instantTranchesComplete([{ status: "FAILED" }])).toBe(false);
  });
});

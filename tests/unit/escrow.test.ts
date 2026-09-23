import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  depositPlanForPool,
  depositReference,
  poolCovered,
  remainingPoolKes,
} from "@/services/escrow/fees";
import { PaystackLive } from "@/lib/ports/paystack";

describe("deposit math (ADR-012)", () => {
  it("charges the organizer 5% on top of the remaining pool", () => {
    const plan = depositPlanForPool(500_000, 500);
    expect(plan).toEqual({ grossAmountKes: 525_000, poolAmountKes: 500_000, feeKes: 25_000 });
  });

  it("splits a partial deposit correctly", () => {
    const plan = depositPlanForPool(300_000, 500);
    expect(plan.poolAmountKes).toBe(300_000);
    expect(plan.feeKes).toBe(15_000);
    expect(plan.grossAmountKes).toBe(315_000);
  });

  it("refuses non-positive pools", () => {
    expect(() => depositPlanForPool(0, 500)).toThrow();
    expect(() => depositPlanForPool(-1, 500)).toThrow();
  });

  it("coverage requires the full declared pool", () => {
    expect(poolCovered([250_000, 250_000], 500_000)).toBe(true);
    expect(poolCovered([250_000], 500_000)).toBe(false);
    // Over-coverage (defense against forged webhooks) still locks.
    expect(poolCovered([600_000], 500_000)).toBe(true);
  });

  it("remaining pool never goes negative", () => {
    expect(remainingPoolKes(500_000, 700_000)).toBe(0);
    expect(remainingPoolKes(500_000, 200_000)).toBe(300_000);
  });

  it("references are unique-ish, lowercase, anchored to the event", () => {
    const a = depositReference("clx1234567890", "AABBCCDD");
    const b = depositReference("clx1234567890", "AABBCCDD");
    expect(a).toBe("hv-34567890-aabbccdd");
    expect(a).toBe(b);
    expect(depositReference("clx1234567890", "11223344")).not.toBe(a);
  });
});

describe("Paystack webhook HMAC verification", () => {
  const secret = "sk_test_deadbeef";
  const rawBody = JSON.stringify({
    event: "charge.success",
    data: { reference: "hv-abc-123", amount: 52500000 },
  });

  function sign(body: string, key: string): string {
    return createHmac("sha512", key).update(body).digest("hex");
  }

  it("accepts a correctly signed payload", () => {
    const port = new PaystackLive(secret);
    expect(port.verifyWebhookSignature(rawBody, sign(rawBody, secret))).toBe(true);
  });

  it("rejects wrong keys, tampered bodies, and missing signatures", () => {
    const port = new PaystackLive(secret);
    expect(port.verifyWebhookSignature(rawBody, sign(rawBody, "sk_test_other"))).toBe(false);
    expect(port.verifyWebhookSignature(rawBody + " ", sign(rawBody, secret))).toBe(false);
    expect(port.verifyWebhookSignature(rawBody, null)).toBe(false);
  });
});

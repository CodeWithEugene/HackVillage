import { describe, expect, it } from "vitest";
import { disburse } from "@backend/services/payout";
import { lockPrizePool } from "@backend/services/escrow";

describe("payout idempotency stubs", () => {
  it("rejects missing idempotency key", async () => {
    const result = await disburse({
      idempotencyKey: "",
      amountKes: 1000,
      recipient: { type: "mpesa", accountRef: "254700000000", name: "Test" },
      reason: "INSTANT_50",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fundsRemainLocked).toBe(true);
    }
  });

  it("returns a stub transfer when idempotency key is present", async () => {
    const result = await disburse({
      idempotencyKey: "evt-1-instant-winner-a",
      amountKes: 250000,
      recipient: { type: "mpesa", accountRef: "254700000000", name: "Winner" },
      reason: "INSTANT_50",
    });

    expect(result).toEqual({
      ok: true,
      transferCode: "stub-transfer-evt-1-instant-winner-a",
    });
  });
});

describe("escrow lock stub", () => {
  it("returns PRIZE_VAULT state", async () => {
    const result = await lockPrizePool({
      eventId: "evt_1",
      amountKes: 500000,
      paystackReference: "ref_1",
    });

    expect(result.state).toBe("PRIZE_VAULT");
    expect(result.ledgerTxHash).toContain("evt_1");
  });
});

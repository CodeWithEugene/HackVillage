import { describe, expect, it } from "vitest";

import {
  LEDGER_TYPE_LABELS,
  payloadAmountKes,
  payloadReference,
  shortenHash,
} from "@/app/(marketing)/trust/ledger";
import {
  median,
  summarizeMediaTimeliness,
  summarizePayoutPerformance,
  type PayoutRecord,
} from "@/app/(marketing)/organizers/[slug]/performance";

describe("ledger payload extraction", () => {
  it("reads amountKes from payout and lock payloads", () => {
    expect(payloadAmountKes({ amountKes: 50_000, txRef: "HV-1" })).toBe(50_000);
    expect(payloadAmountKes({ amountKes: 120_000, paystackRef: "ref" })).toBe(120_000);
  });

  it("returns null for missing or malformed amounts instead of throwing", () => {
    expect(payloadAmountKes(null)).toBeNull();
    expect(payloadAmountKes({})).toBeNull();
    expect(payloadAmountKes({ amountKes: "50000" })).toBeNull();
    expect(payloadAmountKes([1, 2])).toBeNull();
  });

  it("prefers the transfer reference, then payment, refund and contract refs", () => {
    expect(payloadReference({ txRef: "HV-1", paystackRef: "ref" })).toBe("HV-1");
    expect(payloadReference({ paystackRef: "ref" })).toBe("ref");
    expect(payloadReference({ refundRef: "rf-1" })).toBe("rf-1");
    expect(payloadReference({ contractAddress: "0xabc" })).toBe("0xabc");
    expect(payloadReference({})).toBeNull();
    expect(payloadReference(null)).toBeNull();
  });

  it("labels every ledger entry type", () => {
    expect(Object.keys(LEDGER_TYPE_LABELS).sort()).toEqual(
      ["DEPOSIT_LOCKED", "INSTANT_PAYOUT", "MILESTONE_PAYOUT", "VAULT_CREATED", "VAULT_REFUNDED"].sort(),
    );
  });
});

describe("shortenHash", () => {
  it("keeps short values whole and truncates long ones at both ends", () => {
    expect(shortenHash("0xabc")).toBe("0xabc");
    expect(shortenHash("0x1234567890abcdef")).toBe("0x1234…cdef");
  });
});

describe("median", () => {
  it("handles odd, even and empty samples", () => {
    expect(median([10])).toBe(10);
    expect(median([30, 10, 20])).toBe(20);
    expect(median([10, 20])).toBe(15);
    expect(median([])).toBeNull();
  });
});

const instant = (overrides: Partial<PayoutRecord> = {}): PayoutRecord => ({
  tranche: "INSTANT",
  status: "SUCCEEDED",
  paidAt: new Date("2026-06-01T10:30:00Z"),
  announcedAt: new Date("2026-06-01T10:00:00Z"),
  ...overrides,
});

describe("summarizePayoutPerformance", () => {
  it("counts only the instant tranche and computes the median announce-to-paid time", () => {
    const result = summarizePayoutPerformance([
      instant(),
      instant({ paidAt: new Date("2026-06-01T11:00:00Z") }), // 60 min
      instant({ tranche: "MILESTONE" }), // ignored: not instant
      instant({ status: "QUEUED", paidAt: null }), // attempted but not succeeded
    ]);
    expect(result.instantTotal).toBe(3);
    expect(result.instantSucceeded).toBe(2);
    expect(result.medianInstantMinutes).toBe(45);
  });

  it("reports an honest empty state when there are no payouts", () => {
    const result = summarizePayoutPerformance([]);
    expect(result).toEqual({ instantTotal: 0, instantSucceeded: 0, medianInstantMinutes: null });
  });

  it("ignores succeeded payouts without a paidAt and negative durations", () => {
    const result = summarizePayoutPerformance([
      instant({ paidAt: null }),
      instant({ paidAt: new Date("2026-06-01T09:00:00Z") }), // before announce: bad clock
    ]);
    expect(result.instantSucceeded).toBe(2);
    expect(result.medianInstantMinutes).toBeNull();
  });
});

describe("summarizeMediaTimeliness", () => {
  const asset = (eventId: string, uploadedAt: string, mediaDeadlineAt: string | null) => ({
    eventId,
    uploadedAt: new Date(uploadedAt),
    mediaDeadlineAt: mediaDeadlineAt ? new Date(mediaDeadlineAt) : null,
  });

  it("judges each event by its first upload against the deadline", () => {
    const result = summarizeMediaTimeliness([
      asset("a", "2026-06-03T10:00:00Z", "2026-06-03T12:00:00Z"), // on time (first upload)
      asset("a", "2026-06-05T10:00:00Z", "2026-06-03T12:00:00Z"), // late but not first
      asset("b", "2026-06-04T10:00:00Z", "2026-06-03T12:00:00Z"), // late
    ]);
    expect(result).toEqual({ eventsWithMedia: 2, onTime: 1 });
  });

  it("skips events with no deadline set", () => {
    const result = summarizeMediaTimeliness([asset("a", "2026-06-03T10:00:00Z", null)]);
    expect(result).toEqual({ eventsWithMedia: 0, onTime: 0 });
  });
});

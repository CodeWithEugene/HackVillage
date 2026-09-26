import { describe, expect, it } from "vitest";

import { canOpenDispute, disputeOpensAt } from "@/services/legacy/dispute-window";

const ANNOUNCED = new Date("2026-09-01T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

describe("milestone dispute window", () => {
  it("opens exactly 14 days after winners are announced", () => {
    expect(disputeOpensAt(ANNOUNCED).toISOString()).toBe("2026-09-15T12:00:00.000Z");
  });

  it("refuses disputes before then and allows them from then on", () => {
    expect(canOpenDispute(ANNOUNCED, new Date(ANNOUNCED.getTime() + 13 * DAY))).toBe(false);
    expect(canOpenDispute(ANNOUNCED, new Date(ANNOUNCED.getTime() + 14 * DAY - 1))).toBe(false);
    expect(canOpenDispute(ANNOUNCED, new Date(ANNOUNCED.getTime() + 14 * DAY))).toBe(true);
    expect(canOpenDispute(ANNOUNCED, new Date(ANNOUNCED.getTime() + 40 * DAY))).toBe(true);
  });
});

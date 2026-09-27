import { describe, expect, it } from "vitest";

import {
  MONEY_CONFIRM_THRESHOLD_KES,
  typedConfirmRequired,
} from "@/components/patterns/confirm-money-action";

describe("typedConfirmRequired", () => {
  it("defaults the threshold to KES 250,000 (plan §8.2)", () => {
    expect(MONEY_CONFIRM_THRESHOLD_KES).toBe(250_000);
  });

  it("requires typed confirmation strictly above the threshold", () => {
    expect(typedConfirmRequired(250_001)).toBe(true);
    expect(typedConfirmRequired(500_000)).toBe(true);
  });

  it("takes a plain confirm at or below the threshold", () => {
    expect(typedConfirmRequired(250_000)).toBe(false);
    expect(typedConfirmRequired(1_000)).toBe(false);
    expect(typedConfirmRequired(0)).toBe(false);
  });

  it("honours a custom threshold", () => {
    expect(typedConfirmRequired(50_000, 40_000)).toBe(true);
    expect(typedConfirmRequired(40_000, 40_000)).toBe(false);
    // Threshold 0 = simple confirm for non-money actions (event cancellation).
    expect(typedConfirmRequired(0, 0)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { cn, depositGrossForPool, formatKes, platformFeeForPool } from "@/lib/utils";

describe("formatKes", () => {
  it("formats whole amounts with thousands separators", () => {
    expect(formatKes(150_000)).toBe("KES 150,000");
  });

  it("rounds fractional amounts to whole shillings", () => {
    expect(formatKes(1_499.6)).toBe("KES 1,500");
  });

  it("handles zero and the minimum pool", () => {
    expect(formatKes(0)).toBe("KES 0");
    expect(formatKes(10_000)).toBe("KES 10,000");
  });
});

describe("ADR-012 fee math", () => {
  const FEE_BPS = 500; // 5%

  it("charges the organizer 5% on top of the pool", () => {
    expect(depositGrossForPool(500_000, FEE_BPS)).toBe(525_000);
    expect(platformFeeForPool(500_000, FEE_BPS)).toBe(25_000);
  });

  it("keeps the pool portion exactly equal to the declared pool", () => {
    expect(depositGrossForPool(10_000, FEE_BPS) - platformFeeForPool(10_000, FEE_BPS)).toBe(
      10_000
    );
  });

  it("supports a zero fee", () => {
    expect(depositGrossForPool(500_000, 0)).toBe(500_000);
    expect(platformFeeForPool(500_000, 0)).toBe(0);
  });
});

describe("cn", () => {
  it("merges conditional classes", () => {
    expect(cn("p-2", false && "hidden", "px-4")).toBe("p-2 px-4");
  });

  it("resolves conflicting tailwind classes (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

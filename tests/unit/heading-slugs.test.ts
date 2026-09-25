import { describe, expect, it } from "vitest";

import { headingSlugs, tocLabel } from "@/lib/legal/headings";

describe("headingSlugs", () => {
  it("drops section numbers and punctuation", () => {
    expect(headingSlugs(["2. What's Public Vs. Private", "13. Contact"])).toEqual([
      "whats-public-vs-private",
      "contact",
    ]);
  });

  it("keeps slugs unique when headings repeat", () => {
    expect(headingSlugs(["Payouts", "Payouts", "Payouts"])).toEqual([
      "payouts",
      "payouts-2",
      "payouts-3",
    ]);
  });

  it("falls back to a section number when a heading has no letters", () => {
    expect(headingSlugs(["1.", "***"])).toEqual(["section-1", "section-2"]);
  });
});

describe("tocLabel", () => {
  it("removes the leading section number for the contents list", () => {
    expect(tocLabel("10. International Data Transfers")).toBe("International Data Transfers");
    expect(tocLabel("Who Holds The Money")).toBe("Who Holds The Money");
  });
});

import { describe, expect, it } from "vitest";

import {
  MAX_TRUST_SCORE,
  mediaDeadlineFor,
  trustScoreFrom,
  MEDIA_PENALTY_DELTA,
} from "@/services/media/trust";

describe("trust score math", () => {
  it("starts at 100 and moves with deltas", () => {
    expect(trustScoreFrom(100, -10)).toBe(90);
    expect(trustScoreFrom(90, 10)).toBe(100);
  });

  it("floors at 0 — repeated penalties can't go negative", () => {
    expect(trustScoreFrom(5, -10)).toBe(0);
    expect(trustScoreFrom(0, -10)).toBe(0);
  });

  it("caps at 150, however many points are added", () => {
    expect(trustScoreFrom(145, 10)).toBe(MAX_TRUST_SCORE);
    expect(trustScoreFrom(MAX_TRUST_SCORE, 10)).toBe(MAX_TRUST_SCORE);
  });
});

describe("media deadline", () => {
  it("is exactly endsAt + 48h", () => {
    const ends = new Date("2026-06-01T18:00:00Z");
    const deadline = mediaDeadlineFor(ends);
    expect(deadline.getTime() - ends.getTime()).toBe(48 * 60 * 60 * 1000);
  });

  it("the media penalty is -10", () => {
    expect(MEDIA_PENALTY_DELTA).toBe(-10);
  });
});

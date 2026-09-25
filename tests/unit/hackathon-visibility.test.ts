import { describe, expect, it } from "vitest";

import { isPublicHackathon, PUBLIC_HACKATHON_WHERE } from "@/lib/events/visibility";

const verified = {
  publishedAt: new Date("2026-09-01"),
  prizeVerifiedAt: new Date("2026-09-05"),
  status: "LIVE" as const,
};

describe("isPublicHackathon", () => {
  it("shows a published hackathon whose prize pool is verified", () => {
    expect(isPublicHackathon(verified)).toBe(true);
    expect(isPublicHackathon({ ...verified, status: "SETTLED" })).toBe(true);
  });

  it("hides a hackathon still waiting for its deposit", () => {
    expect(
      isPublicHackathon({ ...verified, prizeVerifiedAt: null, status: "PENDING_DEPOSIT" })
    ).toBe(false);
  });

  it("hides drafts and cancelled hackathons", () => {
    expect(isPublicHackathon({ ...verified, publishedAt: null })).toBe(false);
    expect(isPublicHackathon({ ...verified, status: "CANCELLED" })).toBe(false);
  });
});

describe("PUBLIC_HACKATHON_WHERE", () => {
  it("encodes the same rule for database queries", () => {
    expect(PUBLIC_HACKATHON_WHERE).toEqual({
      publishedAt: { not: null },
      prizeVerifiedAt: { not: null },
      status: { not: "CANCELLED" },
    });
  });
});

import { describe, expect, it } from "vitest";

import {
  canPublishDraft,
  currentPhase,
  isPrizeVerified,
  registrationOpen,
  statusTone,
  submissionWindowOpen,
} from "@/lib/events/lifecycle";
import { eventSlugStem, placesAreUnique, poolFromPrizes } from "@/lib/events/validation";

const MIN_POOL = 10_000;

function draft(overrides: Partial<Parameters<typeof canPublishDraft>[0]> = {}) {
  return {
    title: "Fintech for Matatu Culture",
    venueType: "PHYSICAL" as const,
    startsAt: new Date("2026-08-01T09:00Z"),
    endsAt: new Date("2026-08-03T17:00Z"),
    registrationDeadline: new Date("2026-07-28T23:59Z"),
    problemStatement: "Build the rails Nairobi's matatu economy runs on.",
    prizeCount: 3,
    poolKes: 500_000,
    ...overrides,
  };
}

describe("canPublishDraft", () => {
  it("accepts a complete draft", () => {
    expect(canPublishDraft(draft(), MIN_POOL)).toEqual({ ok: true });
  });

  it("requires a title and problem statement", () => {
    expect(canPublishDraft(draft({ title: "  " }), MIN_POOL).reason).toContain("title");
    expect(canPublishDraft(draft({ problemStatement: "" }), MIN_POOL).reason).toContain(
      "problem statement"
    );
  });

  it("requires at least one prize and the minimum pool (Decision D3)", () => {
    expect(canPublishDraft(draft({ prizeCount: 0 }), MIN_POOL).reason).toContain("prize place");
    expect(canPublishDraft(draft({ poolKes: 9_999 }), MIN_POOL).reason).toContain("10,000");
  });

  it("requires sane ordering: deadline before start, start before end", () => {
    expect(
      canPublishDraft(draft({ registrationDeadline: new Date("2026-08-10T09:00Z") }), MIN_POOL)
        .reason
    ).toContain("before the event starts");
    expect(
      canPublishDraft(draft({ endsAt: new Date("2026-07-30T09:00Z") }), MIN_POOL).reason
    ).toContain("after it starts");
  });
});

describe("windows", () => {
  const published = {
    status: "PENDING_DEPOSIT" as const,
    registrationDeadline: new Date("2026-08-05T00:00Z"),
    publishedAt: new Date("2026-07-01T00:00Z"),
  };

  it("registration is open before the published deadline", () => {
    expect(registrationOpen(published, new Date("2026-08-01T00:00Z"))).toBe(true);
    expect(registrationOpen(published, new Date("2026-08-06T00:00Z"))).toBe(false);
  });

  it("unpublished drafts never open registration", () => {
    expect(registrationOpen({ ...published, publishedAt: null }, new Date("2026-08-01T00:00Z"))).toBe(false);
  });

  it("cancelled events close registration", () => {
    expect(
      registrationOpen({ ...published, status: "CANCELLED" }, new Date("2026-08-01T00:00Z"))
    ).toBe(false);
  });

  it("submissions only during LIVE/IN_PROGRESS and before the end", () => {
    const event = { status: "LIVE" as const, endsAt: new Date("2026-08-03T17:00Z") };
    expect(submissionWindowOpen(event, new Date("2026-08-01T10:00Z"))).toBe(true);
    expect(submissionWindowOpen(event, new Date("2026-08-04T10:00Z"))).toBe(false);
    expect(
      submissionWindowOpen({ ...event, status: "JUDGING" as const }, new Date("2026-08-01T10:00Z"))
    ).toBe(false);
  });
});

describe("phases and trust marks", () => {
  it("maps status to the public timeline phase", () => {
    expect(currentPhase("PENDING_DEPOSIT")).toBe("vault");
    expect(currentPhase("LIVE")).toBe("live");
    expect(currentPhase("JUDGING")).toBe("judging");
    expect(currentPhase("WINNERS_ANNOUNCED")).toBe("winners");
    expect(currentPhase("SETTLED")).toBe("settled");
  });

  it("Prize Verified only when attested and not cancelled", () => {
    expect(isPrizeVerified("LIVE", new Date())).toBe(true);
    expect(isPrizeVerified("LIVE", null)).toBe(false);
    expect(isPrizeVerified("CANCELLED", new Date())).toBe(false);
  });

  it("tones: pending warns, live brands, settled succeeds", () => {
    expect(statusTone("PENDING_DEPOSIT")).toBe("warning");
    expect(statusTone("LIVE")).toBe("brand");
    expect(statusTone("SETTLED")).toBe("success");
    expect(statusTone("CANCELLED")).toBe("danger");
  });
});

describe("prize helpers", () => {
  it("pools sum the places", () => {
    expect(poolFromPrizes([{ amountKes: 250_000 }, { amountKes: 150_000 }, { amountKes: 100_000 }])).toBe(500_000);
  });

  it("places must be unique", () => {
    expect(placesAreUnique([{ place: 1 }, { place: 2 }])).toBe(true);
    expect(placesAreUnique([{ place: 1 }, { place: 1 }])).toBe(false);
  });

  it("slugifies titles", () => {
    expect(eventSlugStem("Fintech for Matatu Culture!")).toBe("fintech-for-matatu-culture");
  });
});

import { describe, expect, it } from "vitest";

import { eventTiming, formatEventDates, formatShortDate } from "@/lib/events/format";

// Noon in Nairobi, so the calendar day never shifts with the test machine's zone.
const eat = (iso: string) => new Date(`${iso}T12:00:00+03:00`);

describe("formatEventDates", () => {
  it("shows a single date for a one day event", () => {
    expect(formatEventDates(eat("2026-10-13"), eat("2026-10-13"))).toBe("13 Oct 2026");
  });

  it("shares the month and year when both dates fall in the same month", () => {
    expect(formatEventDates(eat("2026-10-13"), eat("2026-10-15"))).toBe("13 to 15 Oct 2026");
  });

  it("shows both months when the event crosses a month", () => {
    expect(formatEventDates(eat("2026-09-30"), eat("2026-10-02"))).toBe("30 Sept to 2 Oct 2026");
  });

  it("shows both years when the event crosses a year", () => {
    expect(formatEventDates(eat("2026-12-30"), eat("2027-01-02"))).toBe(
      "30 Dec 2026 to 2 Jan 2027"
    );
  });

  it("uses the Nairobi calendar day, not the server's", () => {
    // 22:30 UTC on 12 Oct is already 13 Oct in Nairobi.
    const lateUtc = new Date("2026-10-12T22:30:00Z");
    expect(formatEventDates(lateUtc, lateUtc)).toBe("13 Oct 2026");
  });
});

describe("formatShortDate", () => {
  it("formats a day and short month", () => {
    expect(formatShortDate(eat("2026-10-10"))).toBe("10 Oct");
  });
});

describe("eventTiming", () => {
  const base = {
    startsAt: eat("2026-10-13"),
    endsAt: eat("2026-10-15"),
  };

  it("is upcoming before the event starts", () => {
    expect(eventTiming({ ...base, status: "LIVE" }, eat("2026-10-01"))).toEqual({
      label: "Upcoming",
      tone: "brand",
    });
  });

  it("is happening now while a live event runs", () => {
    expect(eventTiming({ ...base, status: "IN_PROGRESS" }, eat("2026-10-14"))).toEqual({
      label: "Happening Now",
      tone: "success",
    });
  });

  it("reports judging while judges score", () => {
    expect(eventTiming({ ...base, status: "JUDGING" }, eat("2026-10-16"))).toEqual({
      label: "Judging",
      tone: "brand",
    });
  });

  it("is concluded once winners are out or the event has ended", () => {
    expect(eventTiming({ ...base, status: "SETTLED" }, eat("2026-11-01"))).toEqual({
      label: "Concluded",
      tone: "muted",
    });
    expect(eventTiming({ ...base, status: "LIVE" }, eat("2026-10-20"))).toEqual({
      label: "Concluded",
      tone: "muted",
    });
  });

  it("has no timing for cancelled or disputed events", () => {
    expect(eventTiming({ ...base, status: "CANCELLED" }, eat("2026-10-01"))).toBeNull();
    expect(eventTiming({ ...base, status: "DISPUTED" }, eat("2026-10-01"))).toBeNull();
  });
});

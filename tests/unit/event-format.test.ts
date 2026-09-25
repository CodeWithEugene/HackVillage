import { describe, expect, it } from "vitest";

import {
  defaultPhase,
  formatDateTime,
  formatEventDates,
  formatShortDate,
  hackathonPhase,
  keyDates,
} from "@/lib/events/format";

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

describe("hackathonPhase", () => {
  const event = { startsAt: eat("2026-10-13"), endsAt: eat("2026-10-15") };

  it("is upcoming before it starts", () => {
    expect(hackathonPhase(event, eat("2026-10-01"))).toBe("upcoming");
  });

  it("is ongoing from the start through the end", () => {
    expect(hackathonPhase(event, eat("2026-10-13"))).toBe("ongoing");
    expect(hackathonPhase(event, eat("2026-10-14"))).toBe("ongoing");
    expect(hackathonPhase(event, eat("2026-10-15"))).toBe("ongoing");
  });

  it("is past once it has ended", () => {
    expect(hackathonPhase(event, eat("2026-10-16"))).toBe("past");
  });
});

describe("defaultPhase", () => {
  it("opens on the first tab in order that has hackathons", () => {
    expect(defaultPhase({ ongoing: 2, upcoming: 3, past: 1 })).toBe("ongoing");
    expect(defaultPhase({ ongoing: 0, upcoming: 3, past: 1 })).toBe("upcoming");
    expect(defaultPhase({ ongoing: 0, upcoming: 0, past: 1 })).toBe("past");
  });

  it("falls back to ongoing when there are none at all", () => {
    expect(defaultPhase({ ongoing: 0, upcoming: 0, past: 0 })).toBe("ongoing");
  });
});

describe("formatDateTime", () => {
  it("formats a weekday, date, and 24 hour Nairobi time", () => {
    expect(formatDateTime(new Date("2026-10-13T06:00:00Z"))).toBe("Tue 13 Oct, 09:00");
  });
});

describe("keyDates", () => {
  const event = {
    registrationDeadline: new Date("2026-10-11T06:00:00Z"),
    startsAt: new Date("2026-10-13T06:00:00Z"),
    endsAt: new Date("2026-10-15T15:00:00Z"),
    mediaDeadlineAt: null,
  };

  it("lists the four milestones in order", () => {
    expect(keyDates(event, new Date("2026-10-01T00:00:00Z")).map((d) => d.label)).toEqual([
      "Registration closes",
      "Hacking starts",
      "Submissions close",
      "Media delivered by",
    ]);
  });

  it("marks passed milestones done and highlights only the next one", () => {
    const states = keyDates(event, new Date("2026-10-14T00:00:00Z")).map((d) => d.state);
    expect(states).toEqual(["done", "done", "next", "upcoming"]);
  });

  it("defaults the media deadline to 48 hours after the end", () => {
    const media = keyDates(event, new Date("2026-10-01T00:00:00Z"))[3];
    expect(media.at.toISOString()).toBe("2026-10-17T15:00:00.000Z");
  });

  it("uses the stored media deadline when there is one", () => {
    const stored = new Date("2026-10-16T12:00:00Z");
    const media = keyDates({ ...event, mediaDeadlineAt: stored }, new Date("2026-10-01"))[3];
    expect(media.at).toEqual(stored);
  });

  it("marks everything done once the media deadline passes", () => {
    const states = keyDates(event, new Date("2026-11-01T00:00:00Z")).map((d) => d.state);
    expect(states).toEqual(["done", "done", "done", "done"]);
  });
});

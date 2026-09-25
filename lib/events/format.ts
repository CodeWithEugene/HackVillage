import type { EventStatus } from "@/lib/events/lifecycle";

/** Events are run and displayed on Nairobi time, wherever the server sits. */
const EVENT_TIME_ZONE = "Africa/Nairobi";

const dayMonthYear = new Intl.DateTimeFormat("en-KE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: EVENT_TIME_ZONE,
});

interface DateParts {
  day: string;
  month: string;
  year: string;
}

function toParts(date: Date): DateParts {
  const parts = dayMonthYear.formatToParts(date);
  const pick = (type: "day" | "month" | "year") =>
    parts.find((part) => part.type === type)?.value ?? "";
  return { day: pick("day"), month: pick("month"), year: pick("year") };
}

/** "13 Oct 2026", "13 to 15 Oct 2026", "30 Sept to 2 Oct 2026", "30 Dec 2026 to 2 Jan 2027". */
export function formatEventDates(startsAt: Date, endsAt: Date): string {
  const start = toParts(startsAt);
  const end = toParts(endsAt);
  if (start.year !== end.year) {
    return `${start.day} ${start.month} ${start.year} to ${end.day} ${end.month} ${end.year}`;
  }
  if (start.month !== end.month) {
    return `${start.day} ${start.month} to ${end.day} ${end.month} ${end.year}`;
  }
  if (start.day !== end.day) {
    return `${start.day} to ${end.day} ${end.month} ${end.year}`;
  }
  return `${start.day} ${start.month} ${start.year}`;
}

/** "10 Oct" */
export function formatShortDate(date: Date): string {
  const { day, month } = toParts(date);
  return `${day} ${month}`;
}

export interface EventTiming {
  label: string;
  tone: "brand" | "success" | "muted";
}

/**
 * Where an event sits in time, for the chip on its card. Cancelled and
 * disputed events return null: their status badge already says it all.
 */
export function eventTiming(
  event: { status: EventStatus; startsAt: Date; endsAt: Date },
  now: Date = new Date()
): EventTiming | null {
  switch (event.status) {
    case "CANCELLED":
    case "DISPUTED":
      return null;
    case "WINNERS_ANNOUNCED":
    case "SETTLED":
      return { label: "Concluded", tone: "muted" };
    case "JUDGING":
      return { label: "Judging", tone: "brand" };
    default:
      break;
  }
  if (event.endsAt.getTime() < now.getTime()) return { label: "Concluded", tone: "muted" };
  if (event.startsAt.getTime() <= now.getTime()) return { label: "Happening Now", tone: "success" };
  return { label: "Upcoming", tone: "brand" };
}

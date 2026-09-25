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

export const HACKATHON_PHASES = ["ongoing", "upcoming", "past"] as const;
export type HackathonPhase = (typeof HACKATHON_PHASES)[number];

/** Where a hackathon sits in time, for the listing tabs. */
export function hackathonPhase(
  event: { startsAt: Date; endsAt: Date },
  now: Date = new Date(),
): HackathonPhase {
  if (now.getTime() < event.startsAt.getTime()) return "upcoming";
  if (now.getTime() > event.endsAt.getTime()) return "past";
  return "ongoing";
}

/** The tab to open on: the first, in order, that has any hackathons. */
export function defaultPhase(counts: Record<HackathonPhase, number>): HackathonPhase {
  return HACKATHON_PHASES.find((phase) => counts[phase] > 0) ?? "ongoing";
}

const weekdayDateTime = new Intl.DateTimeFormat("en-KE", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: EVENT_TIME_ZONE,
});

/** "Tue 13 Oct, 09:00" on Nairobi time. */
export function formatDateTime(date: Date): string {
  const parts = weekdayDateTime.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("weekday")} ${pick("day")} ${pick("month")}, ${pick("hour")}:${pick("minute")}`;
}

/** Media must be delivered within 48 hours of the end (plan §13 media standard). */
const MEDIA_WINDOW_MS = 48 * 60 * 60 * 1000;

export interface KeyDate {
  label: string;
  at: Date;
  state: "done" | "next" | "upcoming";
}

/** The milestones a hackathon commits to, in order, with the next one highlighted. */
export function keyDates(
  event: {
    registrationDeadline: Date;
    startsAt: Date;
    endsAt: Date;
    mediaDeadlineAt?: Date | null;
  },
  now: Date = new Date(),
): KeyDate[] {
  const milestones: [string, Date][] = [
    ["Registration closes", event.registrationDeadline],
    ["Hacking starts", event.startsAt],
    ["Submissions close", event.endsAt],
    [
      "Media delivered by",
      event.mediaDeadlineAt ?? new Date(event.endsAt.getTime() + MEDIA_WINDOW_MS),
    ],
  ];
  const nextIndex = milestones.findIndex(([, at]) => at.getTime() > now.getTime());
  return milestones.map(([label, at], index) => ({
    label,
    at,
    state:
      nextIndex === -1 || index < nextIndex ? "done" : index === nextIndex ? "next" : "upcoming",
  }));
}

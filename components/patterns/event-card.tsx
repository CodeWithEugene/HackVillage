import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Users } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { formatEventDates, formatShortDate } from "@/lib/events/format";
import { registrationOpen, type EventStatus } from "@/lib/events/lifecycle";
import { cn, formatKes } from "@/lib/utils";

export interface EventCardData {
  slug: string;
  title: string;
  summary?: string | null;
  venueType: "PHYSICAL" | "ONLINE" | "HYBRID";
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
  registrationDeadline: Date;
  publishedAt?: Date | null;
  status: EventStatus;
  poolKes: number;
  teamCount: number;
  orgName: string;
  orgTrustScore: number;
}

function venueLabel(event: EventCardData): string {
  if (event.venueType === "ONLINE") return "Online";
  const place = event.location ?? "Venue to be announced";
  return event.venueType === "HYBRID" ? `${place} and online` : place;
}

function registrationNote(event: EventCardData, open: boolean): string {
  return open
    ? `Register by ${formatShortDate(event.registrationDeadline)}`
    : "Registration closed";
}

export function EventCard({ event }: { event: EventCardData }) {
  const open = registrationOpen(event);

  return (
    <Link
      href={`/hackathons/${event.slug}`}
      className="group flex h-full flex-col rounded-card bg-surface p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      <div className="text-center">
        <h3 className="font-display text-xl leading-snug font-bold text-ink">{event.title}</h3>
        <p className="mt-1 text-xs font-medium text-muted">by {event.orgName}</p>
        {event.summary ? (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-body-copy">{event.summary}</p>
        ) : null}

        <div className="mt-4 rounded-2xl bg-brand/10 px-4 py-3">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-soft uppercase">
            Prize Pool
          </p>
          <p className="mt-0.5 font-display text-2xl font-bold text-ink">
            {formatKes(event.poolKes)}
          </p>
        </div>
      </div>

      {/* One row: dates and team count keep their width; a long venue truncates. */}
      <ul className="mt-4 mb-5 flex items-center justify-center gap-x-3 text-xs text-body-copy">
        <li className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <CalendarDays aria-hidden className="size-3.5 shrink-0 text-ink-soft" />
          {formatEventDates(event.startsAt, event.endsAt)}
        </li>
        <li className="flex min-w-0 items-center gap-1.5" title={venueLabel(event)}>
          <MapPin aria-hidden className="size-3.5 shrink-0 text-ink-soft" />
          <span className="truncate">{venueLabel(event)}</span>
        </li>
        <li className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <Users aria-hidden className="size-3.5 shrink-0 text-ink-soft" />
          {event.teamCount} team{event.teamCount === 1 ? "" : "s"}
        </li>
      </ul>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink/10 pt-4 text-sm">
        <span className={cn("font-semibold", open ? "text-success" : "text-muted")}>
          {registrationNote(event, open)}
        </span>
        {/* The whole card is the link, so this is a span dressed as the pill button. */}
        <span className={cn(buttonVariants({ size: "sm" }), "shrink-0")}>
          <span className="btn-fill" aria-hidden />
          <span className="btn-content">
            View Hackathon
            <ArrowUpRight aria-hidden className="btn-arrow size-4" />
          </span>
        </span>
      </div>
    </Link>
  );
}

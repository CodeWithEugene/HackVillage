import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock, Lock, MapPin, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PrizeVerifiedBadge } from "@/components/patterns/prize-verified-badge";
import { eventTiming, formatEventDates, formatShortDate } from "@/lib/events/format";
import {
  isPrizeVerified,
  registrationOpen,
  STATUS_LABELS,
  statusTone,
  type EventStatus,
} from "@/lib/events/lifecycle";
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
  prizeVerifiedAt?: Date | null;
  poolKes: number;
  teamCount: number;
  orgName: string;
  orgTrustScore: number;
}

const TIMING_DOT = {
  brand: "bg-brand",
  success: "bg-success",
  muted: "bg-ink/30",
} as const;

function venueLabel(event: EventCardData): string {
  if (event.venueType === "ONLINE") return "Online";
  const place = event.location ?? "Venue to be announced";
  return event.venueType === "HYBRID" ? `${place} and online` : place;
}

function registrationNote(event: EventCardData, open: boolean): string {
  if (open) return `Register by ${formatShortDate(event.registrationDeadline)}`;
  if (event.status === "PENDING_DEPOSIT") return "Awaiting deposit";
  return "Registration closed";
}

export function EventCard({ event }: { event: EventCardData }) {
  const verified = isPrizeVerified(event.status, event.prizeVerifiedAt);
  const open = registrationOpen(event);
  const timing = eventTiming(event);

  return (
    <Link
      href={`/hackathons/${event.slug}`}
      className="group flex h-full flex-col rounded-card border border-ink/10 bg-surface p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <div className="flex items-center justify-between gap-3">
        {verified ? (
          <PrizeVerifiedBadge />
        ) : (
          <Badge variant={statusTone(event.status)}>{STATUS_LABELS[event.status]}</Badge>
        )}
        {timing ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
            <span aria-hidden className={cn("size-1.5 rounded-full", TIMING_DOT[timing.tone])} />
            {timing.label}
          </span>
        ) : null}
      </div>

      <h3 className="mt-4 font-display text-xl font-bold leading-snug text-ink">{event.title}</h3>
      <p className="mt-1 text-xs font-medium text-muted">by {event.orgName}</p>
      {event.summary ? (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-body-copy">{event.summary}</p>
      ) : null}

      <div className="mt-4 rounded-2xl bg-brand/10 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
          Prize Pool
        </p>
        <p className="mt-0.5 font-display text-2xl font-bold text-ink">
          {formatKes(event.poolKes)}
        </p>
        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink-soft">
          {verified ? (
            <>
              <Lock aria-hidden className="size-3.5" /> Locked in escrow
            </>
          ) : (
            <>
              <Clock aria-hidden className="size-3.5" /> Pending verification
            </>
          )}
        </p>
      </div>

      <ul className="mb-5 mt-4 space-y-2 text-sm text-body-copy">
        <li className="flex items-center gap-2">
          <CalendarDays aria-hidden className="size-4 shrink-0 text-ink-soft" />
          {formatEventDates(event.startsAt, event.endsAt)}
        </li>
        <li className="flex items-center gap-2">
          <MapPin aria-hidden className="size-4 shrink-0 text-ink-soft" />
          <span className="truncate">{venueLabel(event)}</span>
        </li>
        <li className="flex items-center gap-2">
          <Users aria-hidden className="size-4 shrink-0 text-ink-soft" />
          {event.teamCount} team{event.teamCount === 1 ? "" : "s"} registered
        </li>
      </ul>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink/10 pt-4 text-sm">
        <span className={cn("font-semibold", open ? "text-success" : "text-muted")}>
          {registrationNote(event, open)}
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-ink">
          View Hackathon
          <ArrowUpRight
            aria-hidden
            className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}

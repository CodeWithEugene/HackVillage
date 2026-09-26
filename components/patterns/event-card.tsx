import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Users } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { categoryLabel, isCategory } from "@/lib/events/categories";
import { coverFor } from "@/lib/events/covers";
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
  categories: string[];
  coverUrl: string | null;
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

export function EventCard({
  event,
  priority = false,
}: {
  event: EventCardData;
  priority?: boolean;
}) {
  const open = registrationOpen(event);
  const categories = event.categories.filter(isCategory);
  const cover = coverFor(event);

  return (
    <Link
      href={`/hackathons/${event.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      <div className="relative aspect-[21/9] overflow-hidden bg-brand/10">
        <Image
          src={cover}
          // Uploaded covers live on R2 and are already sized to 1600x900.
          unoptimized={!cover.startsWith("/")}
          alt={`${event.title} — hackathon on HackVillage`}
          priority={priority}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {categories.length > 0 ? (
          <ul className="absolute top-3 left-3 flex flex-wrap gap-1.5" aria-label="Categories">
            {categories.map((key) => (
              <li
                key={key}
                className="rounded-full bg-white/85 px-2.5 py-0.5 text-[11px] font-semibold text-brand-ink backdrop-blur"
              >
                {categoryLabel(key)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="line-clamp-2 font-display text-lg leading-snug font-bold text-ink">
              {event.title}
            </h3>
            <p className="mt-0.5 truncate text-xs font-medium text-muted">by {event.orgName}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-ink-soft uppercase">
              Prize Pool
            </p>
            <p className="mt-0.5 font-display text-lg font-bold whitespace-nowrap text-ink">
              {formatKes(event.poolKes)}
            </p>
          </div>
        </div>

        {/* One row: dates and team count keep their width; a long venue truncates. */}
        <ul className="mt-3 mb-4 flex items-center gap-x-3 text-xs text-body-copy">
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

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink/10 pt-3 text-sm">
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
      </div>
    </Link>
  );
}

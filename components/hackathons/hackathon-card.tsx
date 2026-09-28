import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ChevronRight, MapPin } from "lucide-react";

import { PrizeVerifiedBadge } from "@/components/patterns/prize-verified-badge";
import { categoryLabel, isCategory } from "@/lib/events/categories";
import { coverFor } from "@/lib/events/covers";
import { formatEventDates } from "@/lib/events/format";
import { isPrizeVerified } from "@/lib/events/lifecycle";
import { statusLine, venueLabel, type ListingCard } from "@/lib/events/listing";
import { cn, formatKes } from "@/lib/utils";

export function isVerified(event: ListingCard): boolean {
  return isPrizeVerified(
    event.status,
    event.prizeVerifiedAt ? new Date(event.prizeVerifiedAt) : null,
  );
}

export function HackathonCover({
  event,
  sizes,
  priority = false,
  className,
}: {
  event: ListingCard;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const cover = coverFor(event);
  return (
    <Image
      src={cover}
      // Uploaded covers live on R2 and are already sized to 1600x900.
      unoptimized={!cover.startsWith("/")}
      alt={`${event.title}, a hackathon on HackVillage`}
      priority={priority}
      fill
      sizes={sizes}
      className={cn(
        "object-cover",
        cover.startsWith("/marketing/hackathons/") && "object-top",
        className,
      )}
    />
  );
}

/** "12 / 20 teams" with a thin capacity bar. */
function TeamCapacity({ event }: { event: ListingCard }) {
  const share = event.maxTeams > 0 ? Math.min(1, event.teamCount / event.maxTeams) : 0;
  return (
    <div className="hk-capacity">
      <span>
        <strong>{event.teamCount}</strong> / {event.maxTeams} teams
      </span>
      <span className="hk-capacity-bar" aria-hidden="true">
        <span style={{ width: `${Math.round(share * 100)}%` }} />
      </span>
    </div>
  );
}

export function StatusPill({ event, now }: { event: ListingCard; now: Date }) {
  const status = statusLine(event, now);
  return (
    <span className={`hk-status hk-status-${status.tone}`}>
      <span className="hk-status-dot" aria-hidden="true" />
      {status.text}
    </span>
  );
}

/** A hackathon in the directory grid: cover, who runs it, when, and where it stands. */
export function HackathonCard({
  event,
  now,
  priority = false,
}: {
  event: ListingCard;
  now: Date;
  priority?: boolean;
}) {
  const categories = event.categories.filter(isCategory);
  return (
    <article className="hk-card">
      <div className="hk-card-cover">
        <HackathonCover
          event={event}
          priority={priority}
          sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
          className="transition-transform duration-500"
        />
        {isVerified(event) ? <PrizeVerifiedBadge className="absolute top-3 right-3" /> : null}
      </div>
      <div className="hk-card-body">
        <h3 className="hk-card-title">
          {/* Stretched link: the whole card is clickable, the title is its name. */}
          <Link href={`/hackathons/${event.slug}`} className="hk-card-link">
            {event.title}
          </Link>
        </h3>
        <p className="hk-card-org">
          by {event.orgName} · Trust score {event.orgTrustScore}
        </p>
        {event.summary ? <p className="hk-card-summary">{event.summary}</p> : null}
        <ul className="hk-card-meta">
          <li>
            <CalendarDays aria-hidden className="size-3.5" />
            {formatEventDates(event.startsAt, event.endsAt)}
          </li>
          <li title={venueLabel(event)}>
            <MapPin aria-hidden className="size-3.5" />
            <span className="truncate">{venueLabel(event)}</span>
          </li>
        </ul>
        <TeamCapacity event={event} />
        {categories.length > 0 ? (
          <ul className="hk-tags" aria-label="Categories">
            {categories.map((key) => (
              <li key={key}>{categoryLabel(key)}</li>
            ))}
          </ul>
        ) : null}
        <div className="hk-card-foot">
          <StatusPill event={event} now={now} />
          <span className="hk-card-prize">
            <span>Prize pool</span>
            {formatKes(event.poolKes)}
          </span>
        </div>
      </div>
    </article>
  );
}

/** The same hackathon as one row of the list view, like a jobs board. */
export function HackathonRow({ event, now }: { event: ListingCard; now: Date }) {
  const categories = event.categories.filter(isCategory);
  return (
    <li className="hk-row">
      <div className="hk-row-main">
        <Link href={`/hackathons/${event.slug}`} className="hk-row-link">
          {event.title}
          <ChevronRight aria-hidden className="size-4" />
        </Link>
        <span className="hk-row-org">by {event.orgName}</span>
      </div>
      <span className="hk-row-tracks">
        {categories.map(categoryLabel).join(", ") || "Open track"}
      </span>
      <span className="hk-row-dates">{formatEventDates(event.startsAt, event.endsAt)}</span>
      <span className="hk-row-venue" title={venueLabel(event)}>
        {venueLabel(event)}
      </span>
      <span className="hk-row-prize">{formatKes(event.poolKes)}</span>
      <StatusPill event={event} now={now} />
    </li>
  );
}

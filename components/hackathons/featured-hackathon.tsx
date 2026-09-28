import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { HackathonCover, isVerified, StatusPill } from "@/components/hackathons/hackathon-card";
import { LandingLink } from "@/components/landing/landing-link";
import { PrizeVerifiedBadge } from "@/components/patterns/prize-verified-badge";
import { categoryLabel, isCategory } from "@/lib/events/categories";
import { formatEventDates } from "@/lib/events/format";
import { registrationOpen } from "@/lib/events/lifecycle";
import { venueLabel, type ListingCard } from "@/lib/events/listing";
import { formatKes } from "@/lib/utils";

/**
 * One hackathon given the spotlight: facts in a narrow column, the cover as
 * a wide story card beside them. Picked automatically (lib/events/listing
 * pickFeatured): the biggest prize still open for registration.
 */
export function FeaturedHackathon({ event, now }: { event: ListingCard; now: Date }) {
  const open = registrationOpen(event, now);
  const categories = event.categories.filter(isCategory);
  const href = `/hackathons/${event.slug}`;
  return (
    <section className="lp-section" aria-labelledby="hk-featured-heading">
      <div className="lp-frame lp-block lp-divided">
        <p className="hk-eyebrow">Featured hackathon</p>
        <div className="hk-featured">
          <dl className="hk-featured-facts">
            <div>
              <dt>Prize pool</dt>
              <dd className="hk-featured-pool">{formatKes(event.poolKes)}</dd>
            </div>
            <div>
              <dt>Dates</dt>
              <dd>{formatEventDates(event.startsAt, event.endsAt)}</dd>
            </div>
            <div>
              <dt>Where</dt>
              <dd>{venueLabel(event)}</dd>
            </div>
            <div>
              <dt>Teams</dt>
              <dd>
                {event.teamCount} of {event.maxTeams} places taken
              </dd>
            </div>
            {categories.length > 0 ? (
              <div>
                <dt>Tracks</dt>
                <dd>{categories.map(categoryLabel).join(", ")}</dd>
              </div>
            ) : null}
            <div className="hk-featured-cta">
              <LandingLink href={href}>
                {open ? "Register Your Team" : "View Hackathon"}
              </LandingLink>
            </div>
          </dl>
          <Link href={href} className="hk-featured-story">
            <HackathonCover event={event} sizes="(min-width: 1024px) 900px, 100vw" />
            <span className="hk-featured-scrim" aria-hidden="true" />
            {isVerified(event) ? <PrizeVerifiedBadge className="absolute top-4 right-4" /> : null}
            <span className="hk-featured-copy">
              <span id="hk-featured-heading" className="hk-featured-title">
                {event.title}
              </span>
              {event.summary ? <span className="hk-featured-summary">{event.summary}</span> : null}
              <span className="hk-featured-meta">
                <StatusPill event={event} now={now} />
                <span className="hk-featured-more">
                  Read the brief <ChevronRight aria-hidden className="size-4" />
                </span>
              </span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { HackathonCover } from "@/components/hackathons/hackathon-card";
import { LandingLink } from "@/components/landing/landing-link";
import { HOST_HACKATHON_HREF } from "@/lib/auth/signup-links";
import { categoryLabel, isCategory } from "@/lib/events/categories";
import type { HackathonPhase } from "@/lib/events/format";
import { listingHref, type ListingCard, type ListingQuery } from "@/lib/events/listing";
import { formatKes } from "@/lib/utils";

const PHASE_LINKS: { key: HackathonPhase; label: string }[] = [
  { key: "ongoing", label: "Ongoing" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
];

/** A staggered wall of live hackathon covers, like a customer-stories collage. */
function CoverWall({ tiles }: { tiles: ListingCard[] }) {
  if (tiles.length === 0) return null;
  const columns = [tiles.slice(0, 2), tiles.slice(2, 4), tiles.slice(4, 5)].filter(
    (column) => column.length > 0,
  );
  return (
    <div className="hk-wall" aria-label="Featured hackathons">
      {columns.map((column, c) => (
        <ul key={c} className={`hk-wall-col hk-wall-col-${c}`}>
          {column.map((event, i) => {
            const category = event.categories.find(isCategory);
            return (
              <li key={event.slug} className="hk-tile">
                <HackathonCover
                  event={event}
                  priority={c === 0 && i === 0}
                  sizes="(min-width: 1024px) 200px, 40vw"
                />
                <span className="hk-tile-scrim" aria-hidden="true" />
                {category ? <span className="hk-tile-tag">{categoryLabel(category)}</span> : null}
                <Link href={`/hackathons/${event.slug}`} className="hk-tile-link">
                  <span className="hk-tile-title">{event.title}</span>
                  <span className="hk-tile-prize">
                    {formatKes(event.poolKes)} <ChevronRight aria-hidden className="size-3.5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ))}
    </div>
  );
}

export function ListingHero({
  tiles,
  query,
  phase,
}: {
  tiles: ListingCard[];
  query: ListingQuery;
  phase: HackathonPhase;
}) {
  return (
    <section className="hk-hero" aria-labelledby="hk-hero-heading">
      <div className="lp-frame hk-hero-frame">
        <div className="hk-hero-bar">
          <span className="hk-hero-kicker">Hackathons</span>
          <nav aria-label="Hackathon phases" className="hk-hero-nav">
            {PHASE_LINKS.map((link) => (
              <Link
                key={link.key}
                href={listingHref(query, { phase: link.key })}
                aria-current={link.key === phase ? "true" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hk-hero-grid">
          <div className="hk-hero-copy">
            <h1 id="hk-hero-heading" className="hk-hero-heading">
              Explore hackathons in Kenya, Africa and online.{" "}
              <span>Every prize pool is locked in escrow before a single line of code.</span>
            </h1>
            <p className="hk-hero-text">
              Every hackathon here has its full prize pool secured in escrow before it goes live, so
              you can build knowing the prize is real.
            </p>
            <div className="lp-hero-actions">
              <LandingLink href="#directory">Find A Hackathon</LandingLink>
              <LandingLink href={HOST_HACKATHON_HREF} variant="secondary">
                Host A Hackathon
              </LandingLink>
            </div>
          </div>
          <CoverWall tiles={tiles} />
        </div>
      </div>
    </section>
  );
}

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

const WALL_COLUMNS = 3;
/** Each column needs a few tiles to scroll through without looking sparse. */
const MIN_PER_COLUMN = 3;
/** Seconds each tile takes to scroll past, so columns of any length move at one pace. */
const SECONDS_PER_TILE = 7;

/**
 * Deal the tiles round-robin into columns, topping short columns up by
 * cycling through the list (starting at a different point per column, so
 * neighbours don't mirror each other).
 */
function dealColumns(tiles: ListingCard[]): ListingCard[][] {
  return Array.from({ length: WALL_COLUMNS }, (_, c) => {
    const column = tiles.filter((_, i) => i % WALL_COLUMNS === c);
    for (let k = 0; column.length < MIN_PER_COLUMN && k < tiles.length * 2; k++) {
      const next = tiles[(c + k) % tiles.length];
      if (next && (!column.includes(next) || tiles.length < MIN_PER_COLUMN)) column.push(next);
    }
    return column;
  });
}

function Tile({
  event,
  hidden,
  priority,
}: {
  event: ListingCard;
  hidden: boolean;
  priority: boolean;
}) {
  const category = event.categories.find(isCategory);
  return (
    <li className="hk-tile" aria-hidden={hidden || undefined}>
      <HackathonCover event={event} priority={priority} sizes="(min-width: 1024px) 180px, 45vw" />
      <span className="hk-tile-scrim" aria-hidden="true" />
      {category ? <span className="hk-tile-tag">{categoryLabel(category)}</span> : null}
      <Link
        href={`/hackathons/${event.slug}`}
        className="hk-tile-link"
        tabIndex={hidden ? -1 : undefined}
      >
        <span className="hk-tile-title">{event.title}</span>
        <span className="hk-tile-prize">
          {formatKes(event.poolKes)} <ChevronRight aria-hidden className="size-3.5" />
        </span>
      </Link>
    </li>
  );
}

/**
 * A wall of live hackathon covers in three columns that scroll forever:
 * the outer two drift up, the middle one down. Each column's tiles are
 * rendered twice so the loop has no seam; the copy is hidden from
 * assistive tech and the keyboard. Pauses on hover or focus, and holds
 * still for reduced motion (the global reduced-motion rule).
 */
function CoverWall({ tiles }: { tiles: ListingCard[] }) {
  if (tiles.length === 0) return null;
  return (
    <div className="hk-wall" aria-label="Featured hackathons">
      {dealColumns(tiles).map((column, c) => (
        <div key={c} className={`hk-wall-col hk-wall-col-${c}`}>
          <ul
            className={c % 2 === 0 ? "hk-wall-track hk-wall-up" : "hk-wall-track hk-wall-down"}
            style={{ animationDuration: `${column.length * SECONDS_PER_TILE}s` }}
          >
            {[false, true].map((hidden) =>
              column.map((event, i) => (
                <Tile
                  key={`${hidden ? "b" : "a"}-${i}-${event.slug}`}
                  event={event}
                  hidden={hidden}
                  priority={!hidden && c === 0 && i === 0}
                />
              )),
            )}
          </ul>
        </div>
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

import Link from "next/link";
import { LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";

import { AutoSubmitSelect } from "@/components/hackathons/auto-submit-select";
import { HackathonCard, HackathonRow } from "@/components/hackathons/hackathon-card";
import { LandingLink } from "@/components/landing/landing-link";
import { NewsletterForm } from "@/components/patterns/newsletter-form";
import { HOST_HACKATHON_HREF } from "@/lib/auth/signup-links";
import { HACKATHON_CATEGORIES } from "@/lib/events/categories";
import { HACKATHON_PHASES, type HackathonPhase } from "@/lib/events/format";
import {
  filterCards,
  isFiltered,
  listingHref,
  PRIZE_RANGES,
  SORTS,
  VENUES,
  type ListingCard,
  type ListingQuery,
} from "@/lib/events/listing";

const PHASE_LABELS: Record<HackathonPhase, string> = {
  ongoing: "Ongoing",
  upcoming: "Upcoming",
  past: "Past",
};

/** Few enough results that the page should suggest what else to look at. */
const FEW_RESULTS = 3;

interface FacetOption {
  key: string;
  label: string;
  href: string;
  count: number;
  active: boolean;
}

function FacetGroup({ title, options }: { title: string; options: FacetOption[] }) {
  return (
    <details className="hk-facet" open>
      <summary>{title}</summary>
      <ul>
        {options.map((option) => (
          <li key={option.key}>
            <Link
              href={option.href}
              aria-current={option.active ? "true" : undefined}
              className={option.count === 0 && !option.active ? "hk-facet-empty" : undefined}
              scroll={false}
            >
              <span>{option.label}</span>
              <span className="hk-facet-count">{option.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Filters({
  cards,
  query,
  phase,
  now,
}: {
  cards: ListingCard[];
  query: ListingQuery;
  phase: HackathonPhase;
  now: Date;
}) {
  // How many results an option would give: the other active filters, plus this option.
  const count = (changes: Partial<ListingQuery>) =>
    filterCards(cards, { ...query, ...changes }, changes.phase ?? phase, now).length;

  const phaseOptions = HACKATHON_PHASES.map((key) => ({
    key,
    label: PHASE_LABELS[key],
    href: listingHref(query, { phase: key }),
    count: count({ phase: key }),
    active: key === phase,
  }));
  const usedCategories = HACKATHON_CATEGORIES.filter(({ key }) =>
    cards.some((card) => card.categories.includes(key)),
  );
  const categoryOptions = [
    {
      key: "all",
      label: "All categories",
      href: listingHref(query, { category: null }),
      count: count({ category: null }),
      active: !query.category,
    },
    ...usedCategories.map(({ key, label }) => ({
      key,
      label,
      href: listingHref(query, { category: key }),
      count: count({ category: key }),
      active: query.category === key,
    })),
  ];
  const venueOptions = [
    {
      key: "all",
      label: "Anywhere",
      href: listingHref(query, { venue: null }),
      count: count({ venue: null }),
      active: !query.venue,
    },
    ...VENUES.map(({ key, label }) => ({
      key,
      label,
      href: listingHref(query, { venue: key }),
      count: count({ venue: key }),
      active: query.venue === key,
    })),
  ];
  const prizeOptions = [
    {
      key: "all",
      label: "Any amount",
      href: listingHref(query, { prize: null }),
      count: count({ prize: null }),
      active: !query.prize,
    },
    ...PRIZE_RANGES.map(({ key, label }) => ({
      key,
      label,
      href: listingHref(query, { prize: key }),
      count: count({ prize: key }),
      active: query.prize === key,
    })),
  ];

  return (
    <div className="hk-filters">
      <FacetGroup title="Status" options={phaseOptions} />
      <FacetGroup title="Category" options={categoryOptions} />
      <FacetGroup title="Where" options={venueOptions} />
      <FacetGroup title="Prize pool" options={prizeOptions} />
      {isFiltered(query) ? (
        <Link href="/hackathons#directory" className="hk-clear" scroll={false}>
          <X aria-hidden className="size-3.5" /> Clear all filters
        </Link>
      ) : null}
    </div>
  );
}

/** Search and sort, as a GET form so every result set is a plain URL. */
function Toolbar({ query, phase }: { query: ListingQuery; phase: HackathonPhase }) {
  return (
    <div className="hk-toolbar">
      <form action="/hackathons#directory" method="get" className="hk-search" role="search">
        {query.phase ? <input type="hidden" name="filter" value={phase} /> : null}
        {query.category ? <input type="hidden" name="category" value={query.category} /> : null}
        {query.venue ? <input type="hidden" name="venue" value={query.venue} /> : null}
        {query.prize ? <input type="hidden" name="prize" value={query.prize} /> : null}
        {query.view !== "grid" ? <input type="hidden" name="view" value={query.view} /> : null}
        <label className="hk-search-field">
          <Search aria-hidden className="size-4" />
          <span className="sr-only">Search hackathons</span>
          <input
            type="search"
            name="q"
            defaultValue={query.q}
            placeholder="Search by name, organizer, city or track"
            maxLength={80}
          />
        </label>
        <label className="hk-sort">
          <span className="sr-only">Sort by</span>
          <AutoSubmitSelect name="sort" defaultValue={query.sort}>
            {SORTS.map((sort) => (
              <option key={sort.key} value={sort.key}>
                Sort: {sort.label}
              </option>
            ))}
          </AutoSubmitSelect>
        </label>
        <button type="submit" className="hk-search-submit">
          Search
        </button>
      </form>
      <nav aria-label="Layout" className="hk-view">
        <Link
          href={listingHref(query, { view: "grid" })}
          aria-current={query.view === "grid" ? "true" : undefined}
          aria-label="Grid view"
          scroll={false}
        >
          <LayoutGrid aria-hidden className="size-4" />
        </Link>
        <Link
          href={listingHref(query, { view: "list" })}
          aria-current={query.view === "list" ? "true" : undefined}
          aria-label="List view"
          scroll={false}
        >
          <List aria-hidden className="size-4" />
        </Link>
      </nav>
    </div>
  );
}

/** Shown under short result lists: what is coming next, and a way to hear about more. */
function KeepLooking({
  suggestions,
  now,
  empty,
}: {
  suggestions: ListingCard[];
  now: Date;
  empty: boolean;
}) {
  return (
    <div className="hk-keep">
      {empty ? (
        <div className="hk-empty">
          <p className="hk-empty-title">No hackathons match this view yet.</p>
          <p>
            Hackathons appear here once their prize pool is secured in escrow. Try another filter,
            or host the first one.
          </p>
          <div className="lp-hero-actions">
            <LandingLink href="/hackathons#directory" variant="secondary">
              Clear Filters
            </LandingLink>
            <LandingLink href={HOST_HACKATHON_HREF}>Host A Hackathon</LandingLink>
          </div>
        </div>
      ) : null}
      {suggestions.length > 0 ? (
        <div>
          <p className="hk-eyebrow">Coming up next</p>
          <div className="hk-grid">
            {suggestions.map((event) => (
              <HackathonCard key={event.slug} event={event} now={now} />
            ))}
          </div>
        </div>
      ) : null}
      <div className="hk-notify">
        <div>
          <p className="hk-notify-title">Hear about new Prize Verified hackathons first.</p>
          <p>One email when a new hackathon opens. No spam, unsubscribe any time.</p>
        </div>
        <NewsletterForm tone="light" />
      </div>
    </div>
  );
}

export function HackathonDirectory({
  cards,
  results,
  suggestions,
  query,
  phase,
  now,
}: {
  /** Everything listed, for facet counts. */
  cards: ListingCard[];
  /** The filtered, sorted set to show. */
  results: ListingCard[];
  /** Upcoming hackathons outside the results, offered when results are few. */
  suggestions: ListingCard[];
  query: ListingQuery;
  phase: HackathonPhase;
  now: Date;
}) {
  const filters = <Filters cards={cards} query={query} phase={phase} now={now} />;
  const activeFilters = [query.category, query.venue, query.prize, query.q].filter(Boolean).length;
  return (
    <section
      id="directory"
      className="lp-section hk-directory"
      aria-labelledby="hk-directory-heading"
    >
      <div className="lp-frame lp-block lp-divided">
        <div className="hk-directory-head">
          <h2 id="hk-directory-heading" className="lp-statement lp-statement-sm">
            Find a hackathon.{" "}
            <span>
              {results.length} {PHASE_LABELS[phase].toLowerCase()} hackathon
              {results.length === 1 ? "" : "s"}
              {query.q ? ` matching “${query.q}”` : ""}.
            </span>
          </h2>
        </div>
        <div className="hk-directory-body">
          <aside className="hk-sidebar" aria-label="Filters">
            {filters}
          </aside>
          <div className="hk-results">
            <details className="hk-filters-mobile">
              <summary>
                <SlidersHorizontal aria-hidden className="size-4" />
                Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
              </summary>
              {filters}
            </details>
            <Toolbar query={query} phase={phase} />
            {results.length > 0 ? (
              query.view === "list" ? (
                <ul className="hk-list" aria-label="Hackathons">
                  <li className="hk-list-head" aria-hidden="true">
                    <span>Hackathon</span>
                    <span>Tracks</span>
                    <span>Dates</span>
                    <span>Where</span>
                    <span>Prize pool</span>
                    <span>Status</span>
                  </li>
                  {results.map((event) => (
                    <HackathonRow key={event.slug} event={event} now={now} />
                  ))}
                </ul>
              ) : (
                <div className="hk-grid">
                  {results.map((event, index) => (
                    // The first covers are above the fold on phones; load them eagerly.
                    <HackathonCard key={event.slug} event={event} now={now} priority={index < 2} />
                  ))}
                </div>
              )
            ) : null}
            {results.length < FEW_RESULTS ? (
              <KeepLooking suggestions={suggestions} now={now} empty={results.length === 0} />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import Link from "next/link";

import { EventCard, type EventCardData } from "@/components/patterns/event-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/db";
import {
  defaultPhase,
  formatEventDates,
  HACKATHON_PHASES,
  hackathonPhase,
  type HackathonPhase,
} from "@/lib/events/format";
import { PUBLIC_HACKATHON_WHERE } from "@/lib/events/visibility";
import { HOST_HACKATHON_HREF } from "@/lib/auth/signup-links";
import { HACKATHON_CATEGORIES, isCategory, type HackathonCategory } from "@/lib/events/categories";
import { CalendarX2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Hackathons in Kenya & Africa — Prizes in Escrow",
  description:
    "Browse ongoing and upcoming hackathons in Kenya, Africa and online. Every one is Prize Verified — the full prize pool is locked in escrow before it goes live.",
  // Filter/tab variants (?filter=, ?category=) all canonicalize to the base
  // listing so they never compete with it as separate pages.
  alternates: { canonical: "/hackathons" },
  openGraph: { url: "/hackathons" },
};

/**
 * The listing is the most crawler- and visitor-heavy page, but `searchParams`
 * makes every request dynamic. Cache the database read (plain ISO strings —
 * `unstable_cache` must stay JSON-safe) and rebuild Dates at render.
 */
type StoredCard = Omit<
  EventCardData,
  "startsAt" | "endsAt" | "registrationDeadline" | "publishedAt"
> & {
  startsAt: string;
  endsAt: string;
  registrationDeadline: string;
  publishedAt: string | null;
};

const getStoredCards = unstable_cache(
  async (): Promise<StoredCard[]> => {
    const events = await prisma.event.findMany({
      where: PUBLIC_HACKATHON_WHERE,
      include: {
        org: { select: { name: true, trustScore: true } },
        prizes: { select: { amountKes: true } },
        _count: { select: { teams: { where: { status: { not: "DISBANDED" } } } } },
      },
      orderBy: { startsAt: "desc" },
      take: 60,
    });
    return events.map((event) => ({
      slug: event.slug,
      title: event.title,
      summary: event.summary,
      venueType: event.venueType,
      location: event.location,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      registrationDeadline: event.registrationDeadline.toISOString(),
      publishedAt: event.publishedAt?.toISOString() ?? null,
      status: event.status,
      poolKes: event.prizes.reduce((sum, prize) => sum + prize.amountKes, 0),
      teamCount: event._count.teams,
      orgName: event.org.name,
      orgTrustScore: event.org.trustScore,
      categories: event.categories,
      coverUrl: event.coverUrl,
    }));
  },
  ["public-hackathon-listing"],
  { revalidate: 300 },
);

const TABS: { key: HackathonPhase; label: string }[] = [
  { key: "ongoing", label: "Ongoing" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
];

function isPhase(value: string | undefined): value is HackathonPhase {
  return HACKATHON_PHASES.some((phase) => phase === value);
}

function listingHref({
  filter,
  category,
}: {
  filter?: HackathonPhase;
  category?: HackathonCategory | null;
}): string {
  const params = new URLSearchParams();
  if (filter) params.set("filter", filter);
  if (category) params.set("category", category);
  const query = params.toString();
  return query ? `/hackathons?${query}` : "/hackathons";
}

/** Ongoing: ends soonest first. Upcoming: starts soonest first. Past: most recent first. */
function sortForPhase<T extends { startsAt: Date; endsAt: Date }>(
  events: T[],
  phase: HackathonPhase,
): T[] {
  const sorted = [...events];
  if (phase === "ongoing") return sorted.sort((a, b) => a.endsAt.getTime() - b.endsAt.getTime());
  if (phase === "upcoming") {
    return sorted.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }
  return sorted.sort((a, b) => b.endsAt.getTime() - a.endsAt.getTime());
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; category?: string }>;
}) {
  const { filter: filterParam, category: categoryParam } = await searchParams;
  const category = isCategory(categoryParam) ? categoryParam : null;
  const now = new Date();

  const stored = await getStoredCards();
  const allCards: EventCardData[] = stored.map((card) => ({
    ...card,
    startsAt: new Date(card.startsAt),
    endsAt: new Date(card.endsAt),
    registrationDeadline: new Date(card.registrationDeadline),
    publishedAt: card.publishedAt ? new Date(card.publishedAt) : null,
  }));
  // Only offer categories that at least one live listing actually uses.
  const usedCategories = HACKATHON_CATEGORIES.filter(({ key }) =>
    allCards.some((card) => card.categories.includes(key)),
  );
  const inCategory = category
    ? allCards.filter((card) => card.categories.includes(category))
    : allCards;
  const counts = { ongoing: 0, upcoming: 0, past: 0 };
  for (const card of inCategory) counts[hackathonPhase(card, now)] += 1;
  const phase = isPhase(filterParam) ? filterParam : defaultPhase(counts);
  const cards = sortForPhase(
    inCategory.filter((card) => hackathonPhase(card, now) === phase),
    phase,
  );

  return (
    <div className="site-container py-16">
      <header className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          Explore Hackathons In Kenya, Africa & Online
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Every hackathon here has its full prize pool secured in escrow before it goes live, so you
          can build knowing the prize is real.
        </p>
      </header>

      <nav aria-label="Filter hackathons" className="mb-8 flex flex-wrap justify-center gap-2">
        {TABS.map((option) => (
          <Link
            key={option.key}
            href={listingHref({ filter: option.key, category })}
            aria-current={option.key === phase ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              option.key === phase ? "bg-brand text-ink" : "bg-ink/5 text-ink-soft hover:bg-ink/10"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </nav>

      {usedCategories.length > 0 ? (
        <nav aria-label="Filter by category" className="mb-8 flex flex-wrap justify-center gap-2">
          {[{ key: null, label: "All Categories" }, ...usedCategories].map((option) => {
            const active = option.key === category;
            return (
              <Link
                key={option.key ?? "all"}
                // Switching category drops the tab, so it opens on one that has results.
                href={listingHref({ category: option.key })}
                aria-current={active ? "page" : undefined}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  active
                    ? "border-brand bg-brand/10 text-ink"
                    : "border-ink/15 text-ink-soft hover:border-ink/30"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {cards.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title="No Hackathons In This View Yet"
          description="Hackathons appear here once their prize pool is secured. Check back soon."
          action={
            <Link href={HOST_HACKATHON_HREF}>
              <Button arrow>Host The First Hackathon</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((event, index) => (
            // Above-the-fold covers load eagerly; they are the page's LCP.
            <EventCard key={event.slug} event={event} priority={index < 3} />
          ))}
        </div>
      )}

      <section
        className="mt-14 border-t border-ink/10 pt-10 text-center"
        aria-labelledby="listing-about"
      >
        <h2 id="listing-about" className="font-display text-xl font-bold text-ink sm:text-2xl">
          Hackathons With Prizes You Can Verify
        </h2>
        <div className="mx-auto mt-4 max-w-2xl space-y-3 leading-7 text-body-copy">
          <p>
            HackVillage lists hackathons in Nairobi, across Kenya, Africa-wide and fully online —
            fintech, agri-tech, civic tech, clean energy, AI and more. A hackathon appears here only
            after its organizer has deposited 100% of the prize pool into escrow and earned the{" "}
            <Link href="/how-escrow-works" className="font-semibold text-ink underline">
              Prize Verified
            </Link>{" "}
            badge. Winners are paid 50% within an hour of results and 50% on milestone delivery,
            with every payout recorded on a public ledger.
          </p>
          {allCards.length > 0 ? (
            <p className="text-sm text-muted">
              Recently listed:{" "}
              {allCards.slice(0, 3).map((event, index) => (
                <span key={event.slug}>
                  {index > 0 ? " · " : ""}
                  <Link href={`/hackathons/${event.slug}`} className="underline hover:text-ink">
                    {event.title}
                  </Link>{" "}
                  ({formatEventDates(event.startsAt, event.endsAt)})
                </span>
              ))}
              .
            </p>
          ) : null}
          <p className="text-sm text-muted">
            Running your own?{" "}
            <Link href={HOST_HACKATHON_HREF} className="font-semibold text-ink underline">
              Host a hackathon
            </Link>{" "}
            and see{" "}
            <Link href="/how-it-works" className="font-semibold text-ink underline">
              how judging and payouts work
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

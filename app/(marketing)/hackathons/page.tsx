import type { Metadata } from "next";
import Link from "next/link";

import { EventCard } from "@/components/patterns/event-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/db";
import {
  defaultPhase,
  HACKATHON_PHASES,
  hackathonPhase,
  type HackathonPhase,
} from "@/lib/events/format";
import { PUBLIC_HACKATHON_WHERE } from "@/lib/events/visibility";
import { HACKATHON_CATEGORIES, isCategory, type HackathonCategory } from "@/lib/events/categories";
import { CalendarX2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Hackathons",
  description: "Browse hackathons on HackVillage, every one with its full prize pool secured.",
};

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

  const allCards = events.map((event) => ({
    slug: event.slug,
    title: event.title,
    summary: event.summary,
    venueType: event.venueType,
    location: event.location,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    registrationDeadline: event.registrationDeadline,
    publishedAt: event.publishedAt,
    status: event.status,
    poolKes: event.prizes.reduce((sum, prize) => sum + prize.amountKes, 0),
    teamCount: event._count.teams,
    orgName: event.org.name,
    orgTrustScore: event.org.trustScore,
    categories: event.categories,
    coverUrl: event.coverUrl,
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
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Explore Hackathons</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Every hackathon here has its full prize pool secured before it goes live, so you can build
          knowing the prize is real.
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
            <Link href="/onboarding/organizer">
              <Button arrow>Host The First Hackathon</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((event) => (
            <EventCard key={event.slug} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

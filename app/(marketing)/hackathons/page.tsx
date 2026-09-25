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
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: filterParam } = await searchParams;
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
  }));
  const counts = { ongoing: 0, upcoming: 0, past: 0 };
  for (const card of allCards) counts[hackathonPhase(card, now)] += 1;
  const phase = isPhase(filterParam) ? filterParam : defaultPhase(counts);
  const cards = sortForPhase(
    allCards.filter((card) => hackathonPhase(card, now) === phase),
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
            href={`/hackathons?filter=${option.key}`}
            aria-current={option.key === phase ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              option.key === phase ? "bg-brand text-ink" : "bg-ink/5 text-ink-soft hover:bg-ink/10"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </nav>

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

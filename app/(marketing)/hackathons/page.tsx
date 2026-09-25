import type { Metadata } from "next";
import Link from "next/link";

import { EventCard } from "@/components/patterns/event-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/db";
import { CalendarX2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Hackathons",
  description: "Browse Prize Verified hackathons on HackVillage.",
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "verified", label: "Prize Verified" },
  { key: "pending", label: "Pending Deposit" },
  { key: "past", label: "Past" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: filterParam } = await searchParams;
  const filter: FilterKey = FILTERS.some((f) => f.key === filterParam)
    ? (filterParam as FilterKey)
    : "all";
  const now = new Date();

  const events = await prisma.event.findMany({
    where: { publishedAt: { not: null } },
    include: {
      org: { select: { name: true, trustScore: true } },
      prizes: { select: { amountKes: true } },
      _count: { select: { teams: { where: { status: { not: "DISBANDED" } } } } },
    },
    orderBy: { startsAt: "desc" },
    take: 60,
  });

  const cards = events
    .map((event) => ({
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
      prizeVerifiedAt: event.prizeVerifiedAt,
      poolKes: event.prizes.reduce((sum, prize) => sum + prize.amountKes, 0),
      teamCount: event._count.teams,
      orgName: event.org.name,
      orgTrustScore: event.org.trustScore,
    }))
    .filter((event) => {
      const past = event.endsAt < now;
      switch (filter) {
        case "verified":
          return !past && Boolean(event.prizeVerifiedAt);
        case "pending":
          return !past && !event.prizeVerifiedAt;
        case "past":
          return past;
        default:
          return true;
      }
    });

  return (
    <div className="site-container py-16">
      <header className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          Prize Verified Hackathons
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Every hackathon here published with 100% of its prize pool declared, and the vault locks it
          before the hackathon goes live.
        </p>
      </header>

      <nav aria-label="Filter hackathons" className="mb-8 flex flex-wrap justify-center gap-2">
        {FILTERS.map((option) => (
          <Link
            key={option.key}
            href={option.key === "all" ? "/hackathons" : `/hackathons?filter=${option.key}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              option.key === filter ? "bg-brand text-ink" : "bg-ink/5 text-ink-soft hover:bg-ink/10"
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
          description="Hackathons land here as organizers publish them. The first Prize Verified pilot lands with the platform launch."
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

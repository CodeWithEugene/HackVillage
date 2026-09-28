import type { Metadata } from "next";
import { unstable_cache } from "next/cache";

import { FeaturedHackathon } from "@/components/hackathons/featured-hackathon";
import { HackathonDirectory } from "@/components/hackathons/hackathon-directory";
import { ListingHero } from "@/components/hackathons/listing-hero";
import { ListingStats } from "@/components/hackathons/listing-stats";
import { VerifySection } from "@/components/hackathons/verify-section";
import { GetStarted } from "@/components/landing/get-started";
import { prisma } from "@/lib/db";
import { hackathonPhase } from "@/lib/events/format";
import {
  filterCards,
  isFiltered,
  listingStats,
  parseListingQuery,
  pickFeatured,
  resolvePhase,
  sortCards,
  type ListingCard,
  type ListingParams,
} from "@/lib/events/listing";
import { PUBLIC_HACKATHON_WHERE } from "@/lib/events/visibility";
import { pageOpenGraph } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "Hackathons In Kenya And Africa With Escrowed Prizes",
  description:
    "Browse ongoing and upcoming hackathons in Kenya, Africa and online. Every one is Prize Verified: the full prize pool is locked in escrow before it goes live.",
  // Every filter, search, sort and layout variant canonicalizes to the base
  // listing so they never compete with it as separate pages.
  alternates: { canonical: "/hackathons" },
  openGraph: pageOpenGraph("/hackathons"),
};

/**
 * The listing is the most crawler- and visitor-heavy page, but `searchParams`
 * makes every request dynamic. Cache the database read (plain ISO strings —
 * `unstable_cache` must stay JSON-safe) and rebuild Dates at render. All
 * filtering, sorting and stats run over this one read (lib/events/listing).
 */
type StoredCard = Omit<
  ListingCard,
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
      maxTeams: event.maxTeams,
      orgName: event.org.name,
      orgTrustScore: event.org.trustScore,
      categories: event.categories,
      coverUrl: event.coverUrl,
      prizeVerifiedAt: event.prizeVerifiedAt?.toISOString() ?? null,
    }));
  },
  // The key changed with the card shape (maxTeams), so no stale entry is reused.
  ["public-hackathon-listing-v2"],
  { revalidate: 300 },
);

/** Cover tiles for the hero: live and upcoming first, biggest prizes first. */
function heroTiles(cards: ListingCard[], now: Date): ListingCard[] {
  const byPool = [...cards].sort((a, b) => b.poolKes - a.poolKes);
  const current = byPool.filter((card) => hackathonPhase(card, now) !== "past");
  const past = byPool.filter((card) => hackathonPhase(card, now) === "past");
  return [...current, ...past].slice(0, 5);
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<ListingParams>;
}) {
  const query = parseListingQuery(await searchParams);
  const now = new Date();

  const stored = await getStoredCards();
  const cards: ListingCard[] = stored.map((card) => ({
    ...card,
    startsAt: new Date(card.startsAt),
    endsAt: new Date(card.endsAt),
    registrationDeadline: new Date(card.registrationDeadline),
    publishedAt: card.publishedAt ? new Date(card.publishedAt) : null,
  }));

  const phase = resolvePhase(cards, query, now);
  const results = sortCards(filterCards(cards, query, phase, now), query.sort, phase, now);
  const shown = new Set(results.map((card) => card.slug));
  const suggestions = sortCards(
    cards.filter((card) => hackathonPhase(card, now) === "upcoming" && !shown.has(card.slug)),
    "recommended",
    "upcoming",
    now,
  ).slice(0, 3);
  // The spotlight is for the default view; once someone filters, results come first.
  const featured = isFiltered(query) ? null : pickFeatured(cards, now);

  return (
    <div className="lp">
      <ListingHero tiles={heroTiles(cards, now)} query={query} phase={phase} />
      <ListingStats stats={listingStats(cards, now)} />
      {featured ? <FeaturedHackathon event={featured} now={now} /> : null}
      <HackathonDirectory
        cards={cards}
        results={results}
        suggestions={suggestions}
        query={query}
        phase={phase}
        now={now}
      />
      <VerifySection recent={cards.slice(0, 3)} />
      <GetStarted />
    </div>
  );
}

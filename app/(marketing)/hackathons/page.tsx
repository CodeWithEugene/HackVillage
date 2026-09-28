import type { Metadata } from "next";

import { FeaturedHackathon } from "@/components/hackathons/featured-hackathon";
import { HackathonDirectory } from "@/components/hackathons/hackathon-directory";
import { ListingHero } from "@/components/hackathons/listing-hero";
import { ListingStats } from "@/components/hackathons/listing-stats";
import { VerifySection } from "@/components/hackathons/verify-section";
import { GetStarted } from "@/components/landing/get-started";
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
import { getListingCards } from "@/lib/events/listing-data";
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

  const cards = await getListingCards();

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

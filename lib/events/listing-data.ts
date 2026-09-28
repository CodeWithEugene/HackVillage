import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db";
import type { ListingCard } from "@/lib/events/listing";
import { PUBLIC_HACKATHON_WHERE } from "@/lib/events/visibility";

/**
 * The hackathon listing is the most crawler- and visitor-heavy page, but
 * `searchParams` makes every request dynamic. Cache the database read (plain ISO strings —
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

/** Every public hackathon as a directory card, newest start first (at most 60). */
export async function getListingCards(): Promise<ListingCard[]> {
  const stored = await getStoredCards();
  return stored.map((card) => ({
    ...card,
    startsAt: new Date(card.startsAt),
    endsAt: new Date(card.endsAt),
    registrationDeadline: new Date(card.registrationDeadline),
    publishedAt: card.publishedAt ? new Date(card.publishedAt) : null,
  }));
}

/**
 * The public hackathon directory (app/(marketing)/hackathons): query
 * parsing, filtering, sorting, facet counts and headline stats. Pure
 * functions over already-loaded cards, so the page can keep its single
 * cached read and every view stays a plain, crawlable URL.
 */
import { categoryLabel, isCategory, type HackathonCategory } from "@/lib/events/categories";
import {
  defaultPhase,
  formatShortDate,
  HACKATHON_PHASES,
  hackathonPhase,
  type HackathonPhase,
} from "@/lib/events/format";
import { registrationOpen, type EventStatus, type VenueType } from "@/lib/events/lifecycle";

export interface ListingCard {
  slug: string;
  title: string;
  summary?: string | null;
  venueType: VenueType;
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
  registrationDeadline: Date;
  publishedAt?: Date | null;
  prizeVerifiedAt?: Date | string | null;
  status: EventStatus;
  poolKes: number;
  teamCount: number;
  maxTeams: number;
  orgName: string;
  orgTrustScore: number;
  categories: string[];
  coverUrl: string | null;
}

export const VENUES = [
  { key: "online", label: "Online", type: "ONLINE" },
  { key: "in-person", label: "In person", type: "PHYSICAL" },
  { key: "hybrid", label: "Hybrid", type: "HYBRID" },
] as const satisfies readonly { key: string; label: string; type: VenueType }[];
export type VenueKey = (typeof VENUES)[number]["key"];

export const PRIZE_RANGES = [
  { key: "under-250k", label: "Under KES 250,000", min: 0, max: 250_000 },
  { key: "250k-400k", label: "KES 250,000 to 400,000", min: 250_000, max: 400_000 },
  { key: "400k-plus", label: "KES 400,000 and up", min: 400_000, max: Infinity },
] as const;
export type PrizeKey = (typeof PRIZE_RANGES)[number]["key"];

export const SORTS = [
  { key: "recommended", label: "Recommended" },
  { key: "closing", label: "Closing soon" },
  { key: "prize", label: "Biggest prize" },
  { key: "newest", label: "Newest" },
] as const;
export type SortKey = (typeof SORTS)[number]["key"];

export type ViewKey = "grid" | "list";

export interface ListingQuery {
  /** null: no tab chosen, so the page opens on the first one with results. */
  phase: HackathonPhase | null;
  category: HackathonCategory | null;
  venue: VenueKey | null;
  prize: PrizeKey | null;
  q: string;
  sort: SortKey;
  view: ViewKey;
}

export type ListingParams = Partial<
  Record<"filter" | "category" | "venue" | "prize" | "q" | "sort" | "view", string | string[]>
>;

const MAX_QUERY_LENGTH = 80;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends string>(value: string | undefined, keys: readonly T[]): T | null {
  return keys.find((key) => key === value) ?? null;
}

/** Unknown or malformed values fall back to defaults instead of erroring. */
export function parseListingQuery(params: ListingParams): ListingQuery {
  const category = first(params.category);
  return {
    phase: oneOf(first(params.filter), HACKATHON_PHASES),
    category: isCategory(category) ? category : null,
    venue: oneOf(
      first(params.venue),
      VENUES.map((v) => v.key),
    ),
    prize: oneOf(
      first(params.prize),
      PRIZE_RANGES.map((r) => r.key),
    ),
    q: (first(params.q) ?? "").trim().slice(0, MAX_QUERY_LENGTH),
    sort:
      oneOf(
        first(params.sort),
        SORTS.map((s) => s.key),
      ) ?? "recommended",
    view: first(params.view) === "list" ? "list" : "grid",
  };
}

/** True when the visitor has narrowed the directory beyond the default view. */
export function isFiltered(query: ListingQuery): boolean {
  return Boolean(query.phase || query.category || query.venue || query.prize || query.q);
}

/** Only non-default values go in the URL, so the base listing stays /hackathons. */
export function listingHref(query: ListingQuery, changes: Partial<ListingQuery> = {}): string {
  const next = { ...query, ...changes };
  const params = new URLSearchParams();
  if (next.phase) params.set("filter", next.phase);
  if (next.category) params.set("category", next.category);
  if (next.venue) params.set("venue", next.venue);
  if (next.prize) params.set("prize", next.prize);
  if (next.q) params.set("q", next.q);
  if (next.sort !== "recommended") params.set("sort", next.sort);
  if (next.view !== "grid") params.set("view", next.view);
  const search = params.toString();
  return search ? `/hackathons?${search}#directory` : "/hackathons#directory";
}

function matchesSearch(card: ListingCard, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const haystack = [
    card.title,
    card.summary ?? "",
    card.orgName,
    card.location ?? "",
    ...card.categories.filter(isCategory).map(categoryLabel),
  ]
    .join(" ")
    .toLowerCase();
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

type Facet = "phase" | "category" | "venue" | "prize";

/**
 * Apply every filter except `skip`, which is how each facet counts its own
 * options: "how many would I get if I picked this instead".
 */
export function filterCards(
  cards: ListingCard[],
  query: ListingQuery,
  phase: HackathonPhase | null,
  now: Date,
  skip?: Facet,
): ListingCard[] {
  const venueType = VENUES.find((v) => v.key === query.venue)?.type;
  const range = PRIZE_RANGES.find((r) => r.key === query.prize);
  return cards.filter(
    (card) =>
      (skip === "phase" || !phase || hackathonPhase(card, now) === phase) &&
      (skip === "category" || !query.category || card.categories.includes(query.category)) &&
      (skip === "venue" || !venueType || card.venueType === venueType) &&
      (skip === "prize" || !range || (card.poolKes >= range.min && card.poolKes < range.max)) &&
      matchesSearch(card, query.q),
  );
}

/** The tab in effect: the chosen one, or the first that has results. */
export function resolvePhase(cards: ListingCard[], query: ListingQuery, now: Date): HackathonPhase {
  if (query.phase) return query.phase;
  const counts = { ongoing: 0, upcoming: 0, past: 0 };
  for (const card of filterCards(cards, query, null, now, "phase")) {
    counts[hackathonPhase(card, now)] += 1;
  }
  return defaultPhase(counts);
}

/** When the card's next deadline falls: registration while open, else the end. */
function nextDeadline(card: ListingCard, now: Date): number {
  return registrationOpen(card, now) ? card.registrationDeadline.getTime() : card.endsAt.getTime();
}

/**
 * Recommended keeps the old per-tab order: ongoing ends soonest first,
 * upcoming starts soonest first, past most recent first.
 */
export function sortCards(
  cards: ListingCard[],
  sort: SortKey,
  phase: HackathonPhase,
  now: Date,
): ListingCard[] {
  const sorted = [...cards];
  switch (sort) {
    case "prize":
      return sorted.sort((a, b) => b.poolKes - a.poolKes);
    case "newest":
      return sorted.sort(
        (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
      );
    case "closing":
      return sorted.sort((a, b) => nextDeadline(a, now) - nextDeadline(b, now));
    default:
      if (phase === "ongoing")
        return sorted.sort((a, b) => a.endsAt.getTime() - b.endsAt.getTime());
      if (phase === "upcoming") {
        return sorted.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
      }
      return sorted.sort((a, b) => b.endsAt.getTime() - a.endsAt.getTime());
  }
}

export interface ListingStats {
  /** Prize money locked for hackathons that have not finished yet. */
  escrowedKes: number;
  openForRegistration: number;
  /** Teams signed up to hackathons that have not finished yet. */
  teamsRegistered: number;
  completed: number;
}

export function listingStats(cards: ListingCard[], now: Date): ListingStats {
  let escrowedKes = 0;
  let openForRegistration = 0;
  let teamsRegistered = 0;
  let completed = 0;
  for (const card of cards) {
    const phase = hackathonPhase(card, now);
    if (phase !== "past") {
      escrowedKes += card.poolKes;
      teamsRegistered += card.teamCount;
    }
    if (phase === "past") completed += 1;
    if (registrationOpen(card, now)) openForRegistration += 1;
  }
  return { escrowedKes, openForRegistration, teamsRegistered, completed };
}

/**
 * The featured slot: the biggest prize still open for registration, else
 * the biggest one running now. Past hackathons are never featured.
 */
export function pickFeatured(cards: ListingCard[], now: Date): ListingCard | null {
  const byPool = [...cards].sort((a, b) => b.poolKes - a.poolKes);
  return (
    byPool.find((card) => registrationOpen(card, now)) ??
    byPool.find((card) => hackathonPhase(card, now) === "ongoing") ??
    null
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "today", "tomorrow", "in 3 days", or a date once it is more than a week out. */
export function relativeDay(date: Date, now: Date): string {
  const days = Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 7) return `in ${days} days`;
  return `on ${formatShortDate(date)}`;
}

export type StatusTone = "open" | "live" | "soon" | "done";

/** One line that says where a hackathon is right now, for cards and rows. */
export function statusLine(card: ListingCard, now: Date): { tone: StatusTone; text: string } {
  const phase = hackathonPhase(card, now);
  if (registrationOpen(card, now)) {
    return {
      tone: "open",
      text: `Registration closes ${relativeDay(card.registrationDeadline, now)}`,
    };
  }
  if (phase === "upcoming")
    return { tone: "soon", text: `Starts ${relativeDay(card.startsAt, now)}` };
  if (phase === "ongoing") {
    return { tone: "live", text: `Building now · ends ${formatShortDate(card.endsAt)}` };
  }
  if (card.status === "WINNERS_ANNOUNCED" || card.status === "SETTLED") {
    return { tone: "done", text: "Winners announced" };
  }
  if (card.status === "JUDGING") return { tone: "done", text: "Judging in progress" };
  return { tone: "done", text: `Ended ${formatShortDate(card.endsAt)}` };
}

export function venueLabel(card: Pick<ListingCard, "venueType" | "location">): string {
  if (card.venueType === "ONLINE") return "Online";
  const place = card.location ?? "Venue to be announced";
  return card.venueType === "HYBRID" ? `${place} and online` : place;
}

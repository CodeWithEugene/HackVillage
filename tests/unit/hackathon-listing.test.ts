import { describe, expect, it } from "vitest";

import {
  filterCards,
  isFiltered,
  listingHref,
  listingStats,
  parseListingQuery,
  pickFeatured,
  relativeDay,
  resolvePhase,
  sortCards,
  statusLine,
  type ListingCard,
} from "@/lib/events/listing";

const eat = (iso: string) => new Date(`${iso}T12:00:00+03:00`);
const NOW = eat("2026-09-28");

function card(overrides: Partial<ListingCard> & { slug: string }): ListingCard {
  return {
    title: overrides.slug,
    summary: null,
    venueType: "PHYSICAL",
    location: "Nairobi",
    startsAt: eat("2026-10-10"),
    endsAt: eat("2026-10-12"),
    registrationDeadline: eat("2026-10-08"),
    publishedAt: eat("2026-09-01"),
    prizeVerifiedAt: eat("2026-09-01"),
    status: "LIVE",
    poolKes: 300_000,
    teamCount: 0,
    maxTeams: 20,
    orgName: "Technetium Kenya",
    orgTrustScore: 100,
    categories: ["ai"],
    coverUrl: null,
    ...overrides,
  };
}

const ONGOING = card({
  slug: "ongoing",
  startsAt: eat("2026-09-25"),
  endsAt: eat("2026-10-05"),
  registrationDeadline: eat("2026-09-24"),
  status: "IN_PROGRESS",
  poolKes: 225_000,
  teamCount: 6,
  venueType: "ONLINE",
  categories: ["civic"],
});
const UPCOMING_BIG = card({ slug: "upcoming-big", poolKes: 500_000, categories: ["fintech"] });
const UPCOMING_SMALL = card({
  slug: "upcoming-small",
  startsAt: eat("2026-10-02"),
  endsAt: eat("2026-10-03"),
  registrationDeadline: eat("2026-09-30"),
  poolKes: 150_000,
  venueType: "HYBRID",
  publishedAt: eat("2026-09-20"),
});
const PAST = card({
  slug: "past",
  startsAt: eat("2026-09-01"),
  endsAt: eat("2026-09-03"),
  registrationDeadline: eat("2026-08-30"),
  status: "SETTLED",
  poolKes: 430_000,
});
const ALL = [ONGOING, UPCOMING_BIG, UPCOMING_SMALL, PAST];

describe("parseListingQuery", () => {
  it("falls back to defaults for unknown values", () => {
    expect(
      parseListingQuery({
        filter: "soon",
        category: "nope",
        venue: "moon",
        sort: "x",
        view: "cards",
      }),
    ).toEqual({
      phase: null,
      category: null,
      venue: null,
      prize: null,
      q: "",
      sort: "recommended",
      view: "grid",
    });
  });

  it("keeps valid values, trims the search and caps its length", () => {
    const query = parseListingQuery({
      filter: "past",
      category: "ai",
      venue: "online",
      prize: "400k-plus",
      q: `  ${"a".repeat(120)}  `,
      sort: "prize",
      view: "list",
    });
    expect(query).toMatchObject({
      phase: "past",
      category: "ai",
      venue: "online",
      prize: "400k-plus",
      sort: "prize",
      view: "list",
    });
    expect(query.q).toHaveLength(80);
  });
});

describe("listingHref", () => {
  const base = parseListingQuery({});

  it("is the bare listing when nothing is set", () => {
    expect(listingHref(base)).toBe("/hackathons#directory");
    expect(isFiltered(base)).toBe(false);
  });

  it("only writes non-default values", () => {
    expect(listingHref(base, { category: "ai", view: "list" })).toBe(
      "/hackathons?category=ai&view=list#directory",
    );
  });
});

describe("filterCards and resolvePhase", () => {
  it("opens on the first tab with results", () => {
    expect(resolvePhase(ALL, parseListingQuery({}), NOW)).toBe("ongoing");
    expect(resolvePhase(ALL, parseListingQuery({ category: "fintech" }), NOW)).toBe("upcoming");
  });

  it("combines venue, prize and search filters", () => {
    const query = parseListingQuery({ venue: "hybrid", prize: "under-250k" });
    expect(filterCards(ALL, query, "upcoming", NOW).map((c) => c.slug)).toEqual(["upcoming-small"]);
    const search = parseListingQuery({ q: "technetium FINTECH" });
    expect(filterCards(ALL, search, null, NOW).map((c) => c.slug)).toEqual(["upcoming-big"]);
  });

  it("ignores the skipped facet so each option can count itself", () => {
    const query = parseListingQuery({ venue: "online" });
    expect(filterCards(ALL, query, "upcoming", NOW)).toHaveLength(0);
    expect(filterCards(ALL, query, "upcoming", NOW, "venue")).toHaveLength(2);
  });
});

describe("sortCards", () => {
  const upcoming = [UPCOMING_BIG, UPCOMING_SMALL];

  it("keeps the per-tab order when recommended", () => {
    expect(sortCards(upcoming, "recommended", "upcoming", NOW).map((c) => c.slug)).toEqual([
      "upcoming-small",
      "upcoming-big",
    ]);
  });

  it("sorts by prize, newest and closing deadline", () => {
    expect(sortCards(upcoming, "prize", "upcoming", NOW)[0]?.slug).toBe("upcoming-big");
    expect(sortCards(upcoming, "newest", "upcoming", NOW)[0]?.slug).toBe("upcoming-small");
    expect(sortCards(upcoming, "closing", "upcoming", NOW)[0]?.slug).toBe("upcoming-small");
  });
});

describe("listingStats and pickFeatured", () => {
  it("counts only unfinished hackathons towards escrow and registered teams", () => {
    expect(listingStats(ALL, NOW)).toEqual({
      escrowedKes: 225_000 + 500_000 + 150_000,
      openForRegistration: 2,
      teamsRegistered: 6,
      completed: 1,
    });
  });

  it("features the biggest prize open for registration, never a past one", () => {
    expect(pickFeatured(ALL, NOW)?.slug).toBe("upcoming-big");
    expect(pickFeatured([ONGOING, PAST], NOW)?.slug).toBe("ongoing");
    expect(pickFeatured([PAST], NOW)).toBeNull();
  });
});

describe("statusLine", () => {
  it("describes each phase", () => {
    expect(statusLine(UPCOMING_SMALL, NOW)).toEqual({
      tone: "open",
      text: "Registration closes in 2 days",
    });
    expect(statusLine(ONGOING, NOW)).toEqual({ tone: "live", text: "Building now · ends 5 Oct" });
    expect(statusLine(PAST, NOW)).toEqual({ tone: "done", text: "Winners announced" });
  });

  it("says when a closed upcoming hackathon starts", () => {
    const closed = card({ slug: "closed", registrationDeadline: eat("2026-09-27") });
    expect(statusLine(closed, NOW)).toEqual({ tone: "soon", text: "Starts on 10 Oct" });
  });
});

describe("relativeDay", () => {
  it("reads naturally up to a week out", () => {
    expect(relativeDay(eat("2026-09-28"), NOW)).toBe("today");
    expect(relativeDay(eat("2026-09-29"), NOW)).toBe("tomorrow");
    expect(relativeDay(eat("2026-10-01"), NOW)).toBe("in 3 days");
    expect(relativeDay(eat("2026-10-20"), NOW)).toBe("on 20 Oct");
  });
});

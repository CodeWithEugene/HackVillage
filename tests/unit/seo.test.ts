import { describe, expect, it } from "vitest";

import { isIndexableDeveloper, isRealAccountEmail } from "@/lib/seo/indexable";
import { DEFAULT_OG_IMAGE, pageOpenGraph } from "@/lib/seo/metadata";
import { eventSchema, organizationSchema, profileSchema } from "@/lib/seo/schema";
import { KNOW_ABOUT, SAME_AS, SITE_DESCRIPTION } from "@/lib/seo/site";

const EVENT = {
  slug: "nairobi-build",
  title: "Nairobi Build",
  summary: "Ship something real.",
  startsAt: new Date("2026-10-10T06:00:00Z"),
  endsAt: new Date("2026-10-11T15:00:00Z"),
  venueType: "PHYSICAL" as const,
  location: "Nairobi",
  coverUrl: "/marketing/hackathons/ai.webp",
  orgName: "Technetium Kenya",
  registrationDeadline: new Date("2026-10-08T21:00:00Z"),
};

describe("organizationSchema", () => {
  it("lists only HackVillage's own profiles as the same entity", () => {
    const org = organizationSchema();
    expect(org.sameAs).toEqual([...SAME_AS]);
    expect(JSON.stringify(org.sameAs)).not.toMatch(/technetium|salamander/i);
  });

  it("names Technetium Kenya as the parent organization and uses knowsAbout", () => {
    const org = organizationSchema();
    expect(org.parentOrganization).toMatchObject({ name: "Technetium Kenya" });
    expect(org.knowsAbout).toEqual([...KNOW_ABOUT]);
    expect(org).not.toHaveProperty("knowAbout");
  });
});

describe("eventSchema", () => {
  it("offers registration while it's open and marks it sold out once it closes", () => {
    const open = eventSchema(EVENT, new Date("2026-10-01T00:00:00Z"));
    const closed = eventSchema(EVENT, new Date("2026-10-09T00:00:00Z"));
    expect(open.offers).toMatchObject({ availability: "https://schema.org/InStock" });
    expect(closed.offers).toMatchObject({ availability: "https://schema.org/SoldOut" });
  });

  it("gives hybrid events both a venue and an online location", () => {
    const hybrid = eventSchema({ ...EVENT, venueType: "HYBRID" });
    expect(Array.isArray(hybrid.location)).toBe(true);
    expect((hybrid.location as { "@type": string }[]).map((l) => l["@type"])).toEqual([
      "Place",
      "VirtualLocation",
    ]);
    expect(
      (eventSchema({ ...EVENT, venueType: "ONLINE" }).location as { "@type": string })["@type"],
    ).toBe("VirtualLocation");
  });
});

describe("profileSchema", () => {
  it("uses the bio as the description and doesn't claim HackVillage membership", () => {
    const page = profileSchema({
      handle: "amina",
      name: "Amina",
      headline: "Backend developer",
      bio: "Builds APIs.",
    });
    const person = page.mainEntity as Record<string, unknown>;
    expect(person.description).toBe("Builds APIs.");
    expect(person.jobTitle).toBe("Backend developer");
    expect(person).not.toHaveProperty("memberOf");
    expect(person).not.toHaveProperty("knowsAbout");
  });
});

describe("pageOpenGraph", () => {
  it("always carries the default preview image, so a page can't drop it", () => {
    expect(pageOpenGraph("/how-it-works")).toMatchObject({
      url: "/how-it-works",
      images: [DEFAULT_OG_IMAGE],
    });
  });

  it("lets a page use its own image", () => {
    const custom = [{ url: "/marketing/blog/payouts.webp" }];
    expect(pageOpenGraph("/blog/x", { images: custom }).images).toBe(custom);
  });
});

describe("indexable accounts", () => {
  it("keeps demo, test and scanner accounts out of search", () => {
    expect(isRealAccountEmail("wanjiku@hackvillage.dev")).toBe(false);
    expect(isRealAccountEmail("scan-71132fe9@blockaid-scan.invalid")).toBe(false);
    expect(isRealAccountEmail("a@hackvillage.test")).toBe(false);
    expect(isRealAccountEmail("user@example.com")).toBe(false);
    expect(isRealAccountEmail("not-an-email")).toBe(false);
  });

  it("lets real builders with activity in", () => {
    expect(isRealAccountEmail("amina@gmail.com")).toBe(true);
    expect(
      isIndexableDeveloper({ email: "amina@gmail.com", registrationCount: 1, portfolioCount: 0 }),
    ).toBe(true);
    expect(
      isIndexableDeveloper({ email: "amina@gmail.com", registrationCount: 0, portfolioCount: 0 }),
    ).toBe(false);
  });
});

describe("site copy", () => {
  it("uses no em or en dashes in the text engines quote", () => {
    expect(SITE_DESCRIPTION).not.toMatch(/[—–]/);
    expect(JSON.stringify(organizationSchema())).not.toMatch(/[—–]/);
  });
});

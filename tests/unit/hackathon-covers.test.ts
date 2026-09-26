import { describe, expect, it } from "vitest";

import { HACKATHON_CATEGORIES } from "@/lib/events/categories";
import { coverFor, DEFAULT_COVER } from "@/lib/events/covers";

describe("coverFor", () => {
  it("uses the hackathon's own cover when it has one", () => {
    expect(coverFor({ coverUrl: "/uploads/covers/abc.webp", categories: ["ai"] })).toBe(
      "/uploads/covers/abc.webp"
    );
  });

  it("falls back to a photo for its first known category", () => {
    const cover = coverFor({ coverUrl: null, categories: ["unknown", "fintech"] });
    expect(cover).toMatch(/^\/marketing\/.+\.webp$/);
    expect(cover).not.toBe(DEFAULT_COVER);
  });

  it("replaces old seeded stock covers with a category-specific photo", () => {
    expect(
      coverFor({
        coverUrl: "/marketing/how-it-works/hackathon-winners-with-trophy.webp",
        categories: ["mobility", "civic"],
      }),
    ).toBe("/marketing/hackathons/mobility-hackathon-kenya.webp");
    expect(
      coverFor({
        coverUrl: "/marketing/hero/kenya/kenyan-software-engineer-coding-on-laptop.webp",
        categories: ["ai", "health"],
      }),
    ).toBe("/marketing/hackathons/ai-hackathon-kenya.webp");
  });

  it("preserves explicit covers outside the exact legacy stock list", () => {
    const coverUrl = "/marketing/custom-event.webp";
    expect(coverFor({ coverUrl, categories: ["fintech"] })).toBe(coverUrl);
  });

  it("uses the default photo when there is nothing to go on", () => {
    expect(coverFor({ coverUrl: null, categories: [] })).toBe(DEFAULT_COVER);
  });

  it("has a fallback photo for every category", () => {
    for (const { key } of HACKATHON_CATEGORIES) {
      expect(coverFor({ coverUrl: null, categories: [key] })).toMatch(/^\/marketing\//);
    }
  });
});

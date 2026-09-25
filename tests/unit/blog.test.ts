import { describe, expect, it } from "vitest";

import { allPosts, formatPostDate, getPost, morePosts } from "@/lib/blog";

describe("blog registry", () => {
  it("has unique slugs that match their URL-safe form", () => {
    const slugs = allPosts().map((post) => post.meta.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("finds a post by slug and returns nothing for unknown ones", () => {
    const first = allPosts()[0];
    expect(getPost(first.meta.slug)?.meta.title).toBe(first.meta.title);
    expect(getPost("not-a-real-post")).toBeUndefined();
  });

  it("lists newest first", () => {
    const dates = allPosts().map((post) => post.meta.publishedAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("suggests other posts, never the one being read", () => {
    const slug = allPosts()[0].meta.slug;
    const more = morePosts(slug);
    expect(more.length).toBeGreaterThan(0);
    expect(more.every((post) => post.meta.slug !== slug)).toBe(true);
  });

  it("keeps every post's copy free of em and en dashes", () => {
    for (const { meta } of allPosts()) {
      expect(`${meta.title} ${meta.excerpt} ${meta.coverAlt}`).not.toMatch(/[—–]/);
    }
  });
});

describe("formatPostDate", () => {
  it("formats a publish date for Nairobi readers", () => {
    expect(formatPostDate("2026-09-25")).toBe("25 September 2026");
  });
});

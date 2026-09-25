import { describe, expect, it } from "vitest";

import { allPosts, formatPostDate, getPost, morePosts } from "@/lib/blog";
import { pageCount, pageItems, pageSlice, parsePage } from "@/lib/blog/pagination";

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

  it("suggests every other post unless a limit is given", () => {
    const slug = allPosts()[0].meta.slug;
    expect(morePosts(slug)).toHaveLength(allPosts().length - 1);
    expect(morePosts(slug, 2)).toHaveLength(2);
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

describe("blog pagination", () => {
  it("counts pages, with at least one page", () => {
    expect(pageCount(9, 6)).toBe(2);
    expect(pageCount(8, 3)).toBe(3);
    expect(pageCount(6, 6)).toBe(1);
    expect(pageCount(0, 6)).toBe(1);
  });

  it("reads the page leniently and clamps overshoots", () => {
    expect(parsePage(undefined, 3)).toBe(1);
    expect(parsePage("abc", 3)).toBe(1);
    expect(parsePage("0", 3)).toBe(1);
    expect(parsePage("-2", 3)).toBe(1);
    expect(parsePage("2", 3)).toBe(2);
    expect(parsePage(["3", "1"], 3)).toBe(3);
    expect(parsePage("99", 3)).toBe(3);
  });

  it("slices one page of items", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(pageSlice(items, 1, 3)).toEqual([1, 2, 3]);
    expect(pageSlice(items, 3, 3)).toEqual([7, 8]);
    expect(pageSlice(items, 2, 6)).toEqual([7, 8]);
  });

  it("shows every page when there are only a few", () => {
    expect(pageItems(1, 3)).toEqual([1, 2, 3]);
    expect(pageItems(3, 4)).toEqual([1, 2, 3, 4]);
  });

  it("collapses distant pages into gaps", () => {
    expect(pageItems(5, 9)).toEqual([1, "gap", 4, 5, 6, "gap", 9]);
    expect(pageItems(1, 9)).toEqual([1, 2, "gap", 9]);
    expect(pageItems(9, 9)).toEqual([1, "gap", 8, 9]);
  });
});

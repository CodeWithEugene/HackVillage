import { describe, expect, it } from "vitest";

import { isActivePath } from "@/lib/nav";

describe("isActivePath", () => {
  it("matches Home only on the exact root path", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/hackathons", "/")).toBe(false);
  });

  it("matches a link on its own page and its sub-pages", () => {
    expect(isActivePath("/hackathons", "/hackathons")).toBe(true);
    expect(isActivePath("/hackathons/fintech-for-matatu-culture", "/hackathons")).toBe(true);
  });

  it("does not match a different page that shares a prefix", () => {
    expect(isActivePath("/hackathonsarchive", "/hackathons")).toBe(false);
    expect(isActivePath("/developers", "/hackathons")).toBe(false);
  });

  it("never marks hash links as the current page", () => {
    expect(isActivePath("/", "/#how-it-works")).toBe(false);
  });
});

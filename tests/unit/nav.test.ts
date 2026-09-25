import { describe, expect, it } from "vitest";

import { isActivePath } from "@/lib/nav";

describe("isActivePath", () => {
  it("matches Home only on the exact root path", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/events", "/")).toBe(false);
  });

  it("matches a link on its own page and its sub-pages", () => {
    expect(isActivePath("/events", "/events")).toBe(true);
    expect(isActivePath("/events/fintech-for-matatu-culture", "/events")).toBe(true);
  });

  it("does not match a different page that shares a prefix", () => {
    expect(isActivePath("/eventsarchive", "/events")).toBe(false);
    expect(isActivePath("/developers", "/events")).toBe(false);
  });

  it("never marks hash links as the current page", () => {
    expect(isActivePath("/", "/#how-it-works")).toBe(false);
  });
});

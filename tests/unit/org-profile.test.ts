import { describe, expect, it } from "vitest";

import { canEditOrgProfile, ORG_ABOUT_MAX, parseOrgProfile } from "@/lib/orgs/profile";

describe("parseOrgProfile", () => {
  it("trims the about text and keeps paragraph breaks", () => {
    const result = parseOrgProfile({ about: "  We run hackathons.\n\nIn Kisumu too.  " });
    expect(result).toEqual({ ok: true, data: { about: "We run hackathons.\n\nIn Kisumu too." } });
  });

  it("stores a blank about as null so the card hides it", () => {
    expect(parseOrgProfile({ about: "   " })).toEqual({ ok: true, data: { about: null } });
  });

  it("rejects an about longer than the limit", () => {
    const result = parseOrgProfile({ about: "a".repeat(ORG_ABOUT_MAX + 1) });
    expect(result.ok).toBe(false);
  });

  it("accepts a new name only when name changes are allowed", () => {
    expect(
      parseOrgProfile({ about: "Hi", name: "  Lake Hub Kisumu " }, { allowNameChange: true })
    ).toEqual({ ok: true, data: { about: "Hi", name: "Lake Hub Kisumu" } });
    expect(parseOrgProfile({ about: "Hi", name: "Renamed" })).toEqual({
      ok: true,
      data: { about: "Hi" },
    });
  });

  it("rejects a name that is too short or too long", () => {
    expect(parseOrgProfile({ about: "", name: "A" }, { allowNameChange: true }).ok).toBe(false);
    expect(
      parseOrgProfile({ about: "", name: "x".repeat(81) }, { allowNameChange: true }).ok
    ).toBe(false);
  });

  it("rejects input that is not text", () => {
    expect(parseOrgProfile({ about: 42 }).ok).toBe(false);
  });
});

describe("canEditOrgProfile", () => {
  it("lets owners and admins edit, not members", () => {
    expect(canEditOrgProfile("OWNER")).toBe(true);
    expect(canEditOrgProfile("ADMIN")).toBe(true);
    expect(canEditOrgProfile("MEMBER")).toBe(false);
  });
});

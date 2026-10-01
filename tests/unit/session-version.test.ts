import { describe, expect, it } from "vitest";

import { isSessionCurrent } from "@/lib/auth/session-version";

describe("isSessionCurrent", () => {
  it("accepts a token issued under the account's current version", () => {
    expect(isSessionCurrent(3, { sessionVersion: 3, deletedAt: null })).toBe(true);
  });

  it("rejects a token once the version has been bumped (password change, sign out everywhere)", () => {
    expect(isSessionCurrent(3, { sessionVersion: 4, deletedAt: null })).toBe(false);
  });

  it("treats tokens from before versioning as version 0", () => {
    expect(isSessionCurrent(undefined, { sessionVersion: 0, deletedAt: null })).toBe(true);
    expect(isSessionCurrent(undefined, { sessionVersion: 1, deletedAt: null })).toBe(false);
  });

  it("rejects sessions for deleted or missing accounts", () => {
    expect(isSessionCurrent(0, { sessionVersion: 0, deletedAt: new Date() })).toBe(false);
    expect(isSessionCurrent(0, null)).toBe(false);
  });
});

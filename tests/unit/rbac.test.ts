import { describe, expect, it } from "vitest";

import {
  canAccessSurface,
  canAuthenticate,
  hasRole,
  isOnboarded,
  type SessionUserLike,
} from "@/lib/auth/rbac";

function user(overrides: Partial<SessionUserLike> = {}): SessionUserLike {
  return {
    id: "u_1",
    primaryRole: "DEVELOPER",
    roles: ["DEVELOPER"],
    onboardingCompletedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe("hasRole", () => {
  it("matches granted roles only", () => {
    expect(hasRole(user(), "DEVELOPER")).toBe(true);
    expect(hasRole(user(), "ORGANIZER")).toBe(false);
  });
});

describe("canAccessSurface", () => {
  it("developers reach the developer surface", () => {
    expect(canAccessSurface(user(), "developer")).toBe(true);
    expect(canAccessSurface(user(), "organizer")).toBe(false);
  });

  it("organizer grant unlocks the organizer surface", () => {
    const organizer = user({ primaryRole: "ORGANIZER", roles: ["DEVELOPER", "ORGANIZER"] });
    expect(canAccessSurface(organizer, "organizer")).toBe(true);
    expect(canAccessSurface(organizer, "developer")).toBe(true);
  });

  it("admin reaches every surface", () => {
    const admin = user({ roles: ["ADMIN"] });
    for (const surface of ["developer", "organizer", "judge", "hiring", "admin"] as const) {
      expect(canAccessSurface(admin, surface)).toBe(true);
    }
  });

  it("a forged claim without a grant is still denied — the decision uses server data", () => {
    // e.g. a client claims organizer by routing to /organizer directly
    const imposter = user({ primaryRole: "ORGANIZER", roles: ["DEVELOPER"] });
    expect(canAccessSurface(imposter, "organizer")).toBe(false);
  });

  it("deleted users can reach nothing", () => {
    const deleted = user({ deletedAt: new Date() });
    expect(canAccessSurface(deleted, "developer")).toBe(false);
  });
});

describe("isOnboarded / canAuthenticate", () => {
  it("requires a completed onboarding timestamp", () => {
    expect(isOnboarded(user())).toBe(true);
    expect(isOnboarded(user({ onboardingCompletedAt: null }))).toBe(false);
  });

  it("deleted accounts cannot authenticate", () => {
    expect(canAuthenticate(user())).toBe(true);
    expect(canAuthenticate(user({ deletedAt: new Date() }))).toBe(false);
  });
});

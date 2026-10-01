import { describe, expect, it } from "vitest";

import {
  ADMIN_SESSION_LIMITS,
  STANDARD_SESSION_LIMITS,
  sessionAge,
  sessionLimitsFor,
} from "@/lib/auth/session-policy";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const NOW = Date.UTC(2026, 9, 1, 12);

describe("session limits (NIST SP 800-63B-4)", () => {
  it("gives every account the AAL2 limits: 1 hour idle, 24 hours overall", () => {
    expect(sessionLimitsFor(["ORGANIZER", "JUDGE"])).toEqual({ idleMs: HOUR, absoluteMs: 24 * HOUR });
  });

  it("gives admins the AAL3 limits: 15 minutes idle, 12 hours overall", () => {
    expect(sessionLimitsFor(["ORGANIZER", "ADMIN"])).toEqual({ idleMs: 15 * MIN, absoluteMs: 12 * HOUR });
  });
});

describe("sessionAge", () => {
  it("is active inside both windows", () => {
    const token = { authTime: NOW - 5 * HOUR, lastActive: NOW - 10 * MIN };
    expect(sessionAge(token, STANDARD_SESSION_LIMITS, NOW)).toBe("active");
  });

  it("goes idle after the inactivity window, even mid-day", () => {
    const token = { authTime: NOW - 2 * HOUR, lastActive: NOW - 61 * MIN };
    expect(sessionAge(token, STANDARD_SESSION_LIMITS, NOW)).toBe("idle");
  });

  it("expires after the overall limit even for a constantly active user", () => {
    const token = { authTime: NOW - 24 * HOUR - 1, lastActive: NOW - MIN };
    expect(sessionAge(token, STANDARD_SESSION_LIMITS, NOW)).toBe("expired");
  });

  it("holds admins to their shorter windows", () => {
    expect(
      sessionAge({ authTime: NOW - HOUR, lastActive: NOW - 16 * MIN }, ADMIN_SESSION_LIMITS, NOW)
    ).toBe("idle");
    expect(
      sessionAge({ authTime: NOW - 13 * HOUR, lastActive: NOW - MIN }, ADMIN_SESSION_LIMITS, NOW)
    ).toBe("expired");
  });

  it("treats tokens from before the policy as expired, forcing one fresh sign-in", () => {
    expect(sessionAge({}, STANDARD_SESSION_LIMITS, NOW)).toBe("expired");
  });
});

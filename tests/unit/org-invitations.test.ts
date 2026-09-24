import { describe, expect, it } from "vitest";

import {
  generateInviteCode,
  invitationStatus,
  inviteExpiryFrom,
  INVITE_TTL_DAYS,
  isInvitationUsable,
} from "@/lib/organizations/invitations";

describe("generateInviteCode", () => {
  it("produces 10-char codes from the unambiguous alphabet", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{10}$/);
  });

  it("produces different codes on repeat calls", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateInviteCode()));
    expect(codes.size).toBeGreaterThan(15);
  });
});

describe("invite expiry", () => {
  it("expires 7 days out", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const expiry = inviteExpiryFrom(now);
    expect(expiry.getTime() - now.getTime()).toBe(INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  });
});

describe("isInvitationUsable", () => {
  const now = new Date("2026-01-08T00:00:00Z");

  it("accepts unexpired, unaccepted invites", () => {
    expect(isInvitationUsable({ expiresAt: new Date("2026-01-15T00:00:00Z"), acceptedAt: null }, now)).toBe(true);
  });

  it("rejects expired invites", () => {
    expect(isInvitationUsable({ expiresAt: new Date("2026-01-07T23:59:59Z"), acceptedAt: null }, now)).toBe(false);
  });

  it("rejects already-accepted invites", () => {
    expect(
      isInvitationUsable(
        { expiresAt: new Date("2026-01-15T00:00:00Z"), acceptedAt: new Date("2026-01-02T00:00:00Z") },
        now
      )
    ).toBe(false);
  });

  it("reports the reason", () => {
    expect(invitationStatus({ expiresAt: new Date("2026-01-01T00:00:00Z"), acceptedAt: null }, now)).toEqual({
      usable: false,
      reason: "expired",
    });
    expect(
      invitationStatus(
        { expiresAt: new Date("2026-01-15T00:00:00Z"), acceptedAt: new Date("2026-01-02T00:00:00Z") },
        now
      )
    ).toEqual({ usable: false, reason: "already-used" });
  });
});

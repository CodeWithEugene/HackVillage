import { describe, expect, it } from "vitest";

import {
  generateInviteCode,
  inviteExpiryFrom,
  INVITE_TTL_DAYS,
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

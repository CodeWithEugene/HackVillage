import { randomBytes } from "node:crypto";

/**
 * Organization invitation codes (Phase 1). Pure helpers — DB state passes in
 * and out as plain values.
 */

export const INVITE_TTL_DAYS = 7;

/** 10-char, unambiguous, human-shareable code (no 0/O/1/I/l). */
export function generateInviteCode(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(10);
  let code = "";
  for (const byte of bytes) {
    code += alphabet[byte % alphabet.length];
  }
  return code;
}

export function inviteExpiryFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

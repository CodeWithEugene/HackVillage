import { randomBytes } from "node:crypto";

/**
 * Organization invitation codes (Phase 1). Pure helpers — DB state passes in
 * and out as plain values.
 */

export const INVITE_TTL_DAYS = 7;

export interface InvitationLike {
  expiresAt: Date;
  acceptedAt: Date | null;
}

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

export function isInvitationUsable(invitation: InvitationLike, now: Date = new Date()): boolean {
  return invitation.acceptedAt == null && invitation.expiresAt.getTime() > now.getTime();
}

export interface InviteStatus {
  usable: boolean;
  reason?: "already-used" | "expired";
}

export function invitationStatus(invitation: InvitationLike, now: Date = new Date()): InviteStatus {
  if (invitation.acceptedAt != null) return { usable: false, reason: "already-used" };
  if (invitation.expiresAt.getTime() <= now.getTime()) return { usable: false, reason: "expired" };
  return { usable: true };
}

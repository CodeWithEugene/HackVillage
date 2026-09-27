import { createHmac, timingSafeEqual } from "node:crypto";

import { getEnv } from "@/lib/env";

/**
 * Stateless tokens for the public newsletter list, in the same spirit as
 * lib/notifications/unsubscribe.ts: no extra table, the token is
 * {subscriberId}.{issuedAtMs} signed with the app's session secret, bound to
 * a purpose so an unsubscribe link can never confirm a resubscription (and
 * vice versa). Kept separate from that module because a newsletter
 * subscriber has no User account and no NotificationCategory — it is a flat
 * opt in/out.
 *
 * TTL: new tokens expire after 90 days (the copy says "invalid or expired" —
 * now true). Legacy tokens (issued before the TTL, without an issuedAt
 * segment) still verify for the unsubscribe purpose only: unsubscribing must
 * keep working for every email already sent, and they can't be forged
 * without the secret.
 */

export const NEWSLETTER_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

type TokenPurpose = "unsubscribe" | "resubscribe";

function sign(payload: string): string {
  return createHmac("sha256", getEnv().NEXTAUTH_SECRET).update(payload).digest("base64url");
}

function createToken(subscriberId: string, purpose: TokenPurpose, now: Date = new Date()): string {
  const payload = `${purpose}:${subscriberId}.${now.getTime()}`;
  return Buffer.from(`${subscriberId}.${now.getTime()}.${sign(payload)}`).toString("base64url");
}

function verifyToken(
  token: string,
  purpose: TokenPurpose,
  now: Date = new Date()
): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const separatorIndex = decoded.lastIndexOf(".");
    if (separatorIndex === -1) return null;

    const body = decoded.slice(0, separatorIndex);
    const signature = decoded.slice(separatorIndex + 1);
    if (!body || !signature) return null;

    // Legacy format: "{subscriberId}" with no issuedAt — unsubscribe only,
    // no TTL enforceable (see module note).
    const legacy = purpose === "unsubscribe" && !body.includes(".");
    if (!legacy) {
      const [subscriberId, issuedAtRaw] = body.split(".");
      const issuedAt = Number(issuedAtRaw);
      if (!subscriberId || !Number.isFinite(issuedAt)) return null;
      if (now.getTime() - issuedAt > NEWSLETTER_TOKEN_TTL_MS) return null;
      if (issuedAt > now.getTime() + 60_000) return null; // clock-skew guard
    }

    const expected = sign(legacy ? body : `${purpose}:${body}`);
    const provided = Buffer.from(signature);
    const wanted = Buffer.from(expected);
    if (provided.length !== wanted.length || !timingSafeEqual(provided, wanted)) return null;

    return legacy ? body : body.split(".")[0];
  } catch {
    return null;
  }
}

export function createNewsletterUnsubscribeToken(subscriberId: string): string {
  return createToken(subscriberId, "unsubscribe");
}

export function verifyNewsletterUnsubscribeToken(token: string): string | null {
  return verifyToken(token, "unsubscribe");
}

/**
 * Resubscribe confirmations: re-subscribing a previously unsubscribed
 * address must not clear unsubscribedAt directly — the person proves inbox
 * ownership by clicking this link first.
 */
export function createNewsletterResubscribeToken(subscriberId: string): string {
  return createToken(subscriberId, "resubscribe");
}

export function verifyNewsletterResubscribeToken(token: string): string | null {
  return verifyToken(token, "resubscribe");
}

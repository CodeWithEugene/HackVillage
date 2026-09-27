import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createNewsletterResubscribeToken,
  createNewsletterUnsubscribeToken,
  NEWSLETTER_TOKEN_TTL_MS,
  verifyNewsletterResubscribeToken,
  verifyNewsletterUnsubscribeToken,
} from "@/lib/newsletter/unsubscribe-token";
import { getEnv } from "@/lib/env";
import { createHmac } from "node:crypto";

const SUBSCRIBER = "clxsubscriber1234567890";

function legacyUnsubscribeToken(subscriberId: string): string {
  // The pre-TTL format: {subscriberId}.{sign(subscriberId)} — tokens already
  // sitting in inboxes must keep working (unsubscribe only).
  const signature = createHmac("sha256", getEnv().NEXTAUTH_SECRET)
    .update(subscriberId)
    .digest("base64url");
  return Buffer.from(`${subscriberId}.${signature}`).toString("base64url");
}

describe("newsletter tokens", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("round-trips a token for the right purpose", () => {
    const token = createNewsletterUnsubscribeToken(SUBSCRIBER);
    expect(verifyNewsletterUnsubscribeToken(token)).toBe(SUBSCRIBER);
  });

  it("expires after 90 days", () => {
    const token = createNewsletterUnsubscribeToken(SUBSCRIBER);
    vi.setSystemTime(new Date(Date.now() + NEWSLETTER_TOKEN_TTL_MS + 60_000));
    expect(verifyNewsletterUnsubscribeToken(token)).toBeNull();
  });

  it("still verifies a day before the TTL", () => {
    const token = createNewsletterUnsubscribeToken(SUBSCRIBER);
    vi.setSystemTime(new Date(Date.now() + NEWSLETTER_TOKEN_TTL_MS - 24 * 60 * 60 * 1000));
    expect(verifyNewsletterUnsubscribeToken(token)).toBe(SUBSCRIBER);
  });

  it("never confuses purposes: an unsubscribe token can't resubscribe and vice versa", () => {
    expect(verifyNewsletterResubscribeToken(createNewsletterUnsubscribeToken(SUBSCRIBER))).toBeNull();
    expect(verifyNewsletterUnsubscribeToken(createNewsletterResubscribeToken(SUBSCRIBER))).toBeNull();
  });

  it("resubscribe tokens also expire", () => {
    const token = createNewsletterResubscribeToken(SUBSCRIBER);
    vi.setSystemTime(new Date(Date.now() + NEWSLETTER_TOKEN_TTL_MS + 60_000));
    expect(verifyNewsletterResubscribeToken(token)).toBeNull();
  });

  it("accepts legacy (pre-TTL) tokens for unsubscribe — but never for resubscribe", () => {
    const legacy = legacyUnsubscribeToken(SUBSCRIBER);
    expect(verifyNewsletterUnsubscribeToken(legacy)).toBe(SUBSCRIBER);
    expect(verifyNewsletterResubscribeToken(legacy)).toBeNull();
  });

  it("rejects tampered and malformed tokens", () => {
    expect(verifyNewsletterUnsubscribeToken("not-a-token")).toBeNull();
    expect(verifyNewsletterUnsubscribeToken("")).toBeNull();
    const token = createNewsletterUnsubscribeToken(SUBSCRIBER);
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const tampered = Buffer.from(`${decoded.slice(0, -2)}xx`).toString("base64url");
    expect(verifyNewsletterUnsubscribeToken(tampered)).toBeNull();
    expect(verifyNewsletterUnsubscribeToken(legacyUnsubscribeToken("someone-else"))).toBe("someone-else");
  });
});

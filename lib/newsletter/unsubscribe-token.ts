import { createHmac, timingSafeEqual } from "node:crypto";

import { getEnv } from "@/lib/env";

/**
 * Stateless one click unsubscribe tokens for the public newsletter list, in
 * the same spirit as lib/notifications/unsubscribe.ts: no extra table, the
 * token is just {subscriberId} signed with the app's session secret. Kept
 * separate from that module because a newsletter subscriber has no User
 * account and no NotificationCategory — it is a flat opt in/out.
 */
function sign(payload: string): string {
  return createHmac("sha256", getEnv().NEXTAUTH_SECRET).update(payload).digest("base64url");
}

export function createNewsletterUnsubscribeToken(subscriberId: string): string {
  return Buffer.from(`${subscriberId}.${sign(subscriberId)}`).toString("base64url");
}

export function verifyNewsletterUnsubscribeToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const separatorIndex = decoded.lastIndexOf(".");
    if (separatorIndex === -1) return null;

    const subscriberId = decoded.slice(0, separatorIndex);
    const signature = decoded.slice(separatorIndex + 1);
    if (!subscriberId || !signature) return null;

    const expected = sign(subscriberId);
    const provided = Buffer.from(signature);
    const wanted = Buffer.from(expected);
    if (provided.length !== wanted.length || !timingSafeEqual(provided, wanted)) return null;

    return subscriberId;
  } catch {
    return null;
  }
}

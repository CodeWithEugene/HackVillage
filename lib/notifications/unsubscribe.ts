import { createHmac, timingSafeEqual } from "node:crypto";

import { getEnv } from "@/lib/env";
import { isNotificationCategory, type NotificationCategory } from "@/lib/notifications/types";

/**
 * Stateless one click unsubscribe tokens (no extra DB table needed): the
 * token is just {userId}.{category} signed with the app's existing session
 * secret, so a link can be verified without a round trip lookup.
 */
function sign(payload: string): string {
  return createHmac("sha256", getEnv().NEXTAUTH_SECRET).update(payload).digest("base64url");
}

export function createUnsubscribeToken(userId: string, category: NotificationCategory): string {
  const payload = `${userId}.${category}`;
  return Buffer.from(`${payload}.${sign(payload)}`).toString("base64url");
}

export interface UnsubscribeTokenPayload {
  userId: string;
  category: NotificationCategory;
}

export function verifyUnsubscribeToken(token: string): UnsubscribeTokenPayload | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 3) return null;
    const [userId, category, signature] = parts;
    if (!userId || !isNotificationCategory(category)) return null;

    const expected = sign(`${userId}.${category}`);
    const provided = Buffer.from(signature);
    const wanted = Buffer.from(expected);
    if (provided.length !== wanted.length || !timingSafeEqual(provided, wanted)) return null;

    return { userId, category };
  } catch {
    return null;
  }
}

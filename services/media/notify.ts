import { prisma } from "@/lib/db";

/**
 * In-app notification rows ONLY. This helper intentionally bypasses the
 * email preference system because in-app rows have no opt-out — they are the
 * product's activity feed, not mail.
 *
 * ⚠️ Do NOT add email sending here. Email MUST go through sendNotification
 * (lib/notifications/send), which enforces per-category preferences and adds
 * the RFC 8058 unsubscribe headers. An earlier version of this module fanned
 * out email directly, silently ignoring user preferences — that path was
 * removed; the remaining call sites never used it.
 *
 * (Named notify in services/media for historical reasons — its callers are
 * the legacy-tracker jobs.)
 */
export async function notify(input: {
  userId: string;
  type: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      payload: (input.payload ?? {}) as object,
    },
  });
}

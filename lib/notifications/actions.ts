"use server";

import { prisma } from "@/lib/db";
import { verifyUnsubscribeToken } from "@/lib/notifications/unsubscribe";
import { CATEGORY_LABELS } from "@/lib/notifications/types";

export interface UnsubscribeState {
  error?: string;
  categoryLabel?: string;
  done?: boolean;
}

export async function unsubscribeAction(
  _prev: UnsubscribeState,
  formData: FormData
): Promise<UnsubscribeState> {
  const token = String(formData.get("token") ?? "");
  const payload = verifyUnsubscribeToken(token);
  if (!payload) return { error: "This unsubscribe link is invalid or has expired." };

  await prisma.notificationPreference.upsert({
    where: { userId: payload.userId },
    create: { userId: payload.userId, [payload.category]: false },
    update: { [payload.category]: false },
  });

  return { done: true, categoryLabel: CATEGORY_LABELS[payload.category] };
}

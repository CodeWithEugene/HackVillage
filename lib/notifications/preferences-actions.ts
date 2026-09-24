"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { NOTIFICATION_CATEGORIES } from "@/lib/notifications/types";

export interface PreferencesActionState {
  message?: string;
}

export async function updateNotificationPreferencesAction(
  _prev: PreferencesActionState,
  formData: FormData
): Promise<PreferencesActionState> {
  const user = await requireUser();

  const data = Object.fromEntries(
    NOTIFICATION_CATEGORIES.map((category) => [category, formData.get(category) === "on"])
  );

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  revalidatePath("/settings");
  return { message: "Email preferences saved." };
}

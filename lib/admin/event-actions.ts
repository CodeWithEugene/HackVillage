"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { cancelEventAsAdmin, EventCancelError } from "@/lib/events/cancel";

export interface AdminEventActionState {
  error?: string;
  message?: string;
}

/**
 * Admin force-cancel (audit remediation): requires the ADMIN grant (re-checked
 * against the database inside cancelEventAsAdmin), a real reason (min 4 chars,
 * audit-logged), and a pre-winners hackathon. A LOCKED or HALF_RELEASED vault
 * is refunded through the escrow refund primitive; the organizer is notified.
 */
export async function adminCancelEventAction(
  eventId: string,
  reason: string
): Promise<AdminEventActionState> {
  const admin = await requireUser();
  const parsedId = z.string().cuid().safeParse(eventId);
  const parsedReason = z.string().trim().min(4).max(500).safeParse(reason);
  if (!parsedId.success) return { error: "Unknown hackathon." };
  if (!parsedReason.success) {
    return { error: "Give a short reason (at least 4 characters) — it's audit-logged." };
  }

  try {
    const { slug, refunded } = await cancelEventAsAdmin({
      eventId: parsedId.data,
      adminId: admin.id,
      reason: parsedReason.data,
    });
    revalidatePath("/admin/events");
    revalidatePath(`/hackathons/${slug}`);
    revalidatePath("/hackathons");
    return {
      message: refunded
        ? "Hackathon cancelled and the locked vault was refunded."
        : "Hackathon cancelled.",
    };
  } catch (error) {
    if (error instanceof EventCancelError) return { error: error.message };
    console.error("[admin] event cancel failed", error);
    return { error: "Something went wrong. Try again in a moment." };
  }
}

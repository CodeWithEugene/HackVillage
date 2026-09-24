"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import type { PayoutMethod } from "@/lib/ports/paystack";
import {
  PayoutError,
  adminMarkManuallyPaid,
  adminRetryPayout,
  announceWinners,
  confirmMilestone,
  savePayoutRecipient,
} from "@/services/payout/service";

export interface PayoutActionState {
  error?: string;
  message?: string;
}

function toState(error: unknown): PayoutActionState {
  if (error instanceof PayoutError) return { error: error.message };
  console.error("[payout] action failed", error);
  return { error: "Something went wrong — try again in a moment." };
}

// ── Developer: payout method (recipient onboarding) ──────────────────────

const recipientSchema = z.object({
  type: z.enum(["MPESA", "BANK"]),
  name: z.string().trim().min(2, "Name on the account is required.").max(80),
  accountNumber: z
    .string()
    .trim()
    .regex(/^[0-9]+$/, "Digits only."),
  bankCode: z.string().trim().max(20).optional().or(z.literal("")),
});

export async function savePayoutMethodAction(
  _prev: PayoutActionState,
  formData: FormData
): Promise<PayoutActionState> {
  const user = await requireUser();
  const parsed = recipientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the payout details." };
  }
  const { type, name, accountNumber, bankCode } = parsed.data;

  try {
    await savePayoutRecipient(user.id, {
      type: type as PayoutMethod,
      name,
      accountNumber,
      bankCode: bankCode || undefined,
    });
    revalidatePath("/settings");
    revalidatePath("/dashboard/winnings");
    return { message: "Payout method saved — winnings flow here." };
  } catch (error) {
    return toState(error);
  }
}

// ── Organizer: announce winners ──────────────────────────────────────────

export async function announceWinnersAction(
  _prev: PayoutActionState,
  formData: FormData
): Promise<PayoutActionState> {
  const user = await requireUser();
  const eventId = z.string().cuid().safeParse(String(formData.get("eventId") ?? ""));
  if (!eventId.success) return { error: "Unknown event." };

  let placements: { place: number; teamId: string }[] = [];
  try {
    placements = z
      .array(z.object({ place: z.coerce.number().int().min(1), teamId: z.string().cuid() }))
      .safeParse(JSON.parse(String(formData.get("placements") ?? "[]"))).data ?? [];
  } catch {
    return { error: "The winner selection didn't submit correctly." };
  }
  if (placements.length === 0) return { error: "Select a winning team for every prize place." };

  try {
    await announceWinners({ eventId: eventId.data, organizerId: user.id, placements });
    const event = await prisma.event.findUnique({
      where: { id: eventId.data },
      select: { slug: true },
    });
    if (event) {
      revalidatePath(`/organizer/events/${event.slug}`);
      revalidatePath(`/events/${event.slug}`);
      revalidatePath("/events");
    }
    return { message: "Winners announced — the instant 50% payouts are on their way." };
  } catch (error) {
    return toState(error);
  }
}

// ── Organizer: milestone confirmation ────────────────────────────────────

export async function confirmMilestoneAction(winnerId: string): Promise<PayoutActionState> {
  const user = await requireUser();
  try {
    const result = await confirmMilestone(winnerId, user.id);
    if (result.outcome === "queued") {
      const winner = await prisma.winner.findUnique({
        where: { id: winnerId },
        include: { event: { select: { slug: true } } },
      });
      if (winner) revalidatePath(`/organizer/events/${winner.event.slug}`);
      return { message: "Milestone confirmed — the final 50% is releasing." };
    }
    if (result.outcome === "forbidden") return { error: "Only organization admins can confirm milestones." };
    if (result.outcome === "not-required") return { error: "This prize pays fully on the day — no milestone." };
    return { error: "The milestone can't be confirmed yet (instant tranche unfinished or already confirmed)." };
  } catch (error) {
    return toState(error);
  }
}

// ── Admin: ops queue ─────────────────────────────────────────────────────

export async function adminRetryPayoutAction(payoutId: string): Promise<PayoutActionState> {
  const user = await requireUser();
  try {
    const result = await adminRetryPayout(user.id, payoutId);
    if (result.outcome === "duplicate") return { error: "That payout already succeeded." };
    revalidatePath("/admin/payments");
    return { message: "Retry triggered." };
  } catch (error) {
    return toState(error);
  }
}

export async function adminMarkPaidAction(
  _prev: PayoutActionState,
  formData: FormData
): Promise<PayoutActionState> {
  const user = await requireUser();
  const payoutId = z.string().cuid().safeParse(String(formData.get("payoutId") ?? ""));
  const receipt = z
    .string()
    .trim()
    .min(6, "Paste the payment receipt reference.")
    .max(200)
    .safeParse(String(formData.get("receipt") ?? ""));
  if (!payoutId.success || !receipt.success) {
    return { error: receipt.error?.issues[0]?.message ?? "Check the form and try again." };
  }

  try {
    await adminMarkManuallyPaid(user.id, payoutId.data, receipt.data);
    revalidatePath("/admin/payments");
    return { message: "Marked as paid with receipt." };
  } catch (error) {
    return toState(error);
  }
}

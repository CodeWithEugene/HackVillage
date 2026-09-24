"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import {
  LegacyError,
  openMilestoneDispute,
  recordLegacyOutcome,
  resolveDispute,
} from "@/services/legacy/service";

export interface LegacyActionState {
  error?: string;
  message?: string;
}

function toState(error: unknown): LegacyActionState {
  if (error instanceof LegacyError) return { error: error.message };
  console.error("[legacy] action failed", error);
  return { error: "Something went wrong — try again in a moment." };
}

// ── Developer: legacy outcome + disputes ─────────────────────────────────

export async function recordLegacyOutcomeAction(
  _prev: LegacyActionState,
  formData: FormData
): Promise<LegacyActionState> {
  const user = await requireUser();
  const parsed = z
    .object({
      submissionId: z.string().cuid(),
      outcome: z.enum(["STILL_DEMO", "IN_PRODUCTION", "PIVOTED", "ABANDONED"]),
      notes: z.string().trim().max(1000).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the outcome and try again." };
  }

  try {
    await recordLegacyOutcome({ userId: user.id, ...parsed.data });
    revalidatePath("/dashboard");
    return { message: "Outcome recorded — your portfolio now shows the real trajectory." };
  } catch (error) {
    return toState(error);
  }
}

export async function openDisputeAction(
  _prev: LegacyActionState,
  formData: FormData
): Promise<LegacyActionState> {
  const user = await requireUser();
  const parsed = z
    .object({
      winnerId: z.string().cuid(),
      claim: z.string().trim().min(30, "Describe what happened — at least 30 characters.").max(2000),
      evidenceUrl: z.string().trim().url().optional().or(z.literal("")),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the dispute and try again." };
  }

  try {
    await openMilestoneDispute({
      winnerId: parsed.data.winnerId,
      userId: user.id,
      claim: parsed.data.claim,
      evidenceUrl: parsed.data.evidenceUrl || undefined,
    });
    revalidatePath("/dashboard/winnings");
    return { message: "Dispute opened — platform staff review both sides. Funds stay locked until resolution." };
  } catch (error) {
    return toState(error);
  }
}

// ── Admin: dispute resolution ────────────────────────────────────────────

export async function resolveDisputeAction(
  _prev: LegacyActionState,
  formData: FormData
): Promise<LegacyActionState> {
  const user = await requireUser();
  const parsed = z
    .object({
      disputeId: z.string().cuid(),
      resolution: z.enum(["RELEASE", "REJECT"]),
      note: z.string().trim().min(10, "The resolution note is part of the audit trail.").max(500),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the resolution and try again." };
  }

  try {
    const result = await resolveDispute({ adminId: user.id, ...parsed.data });
    revalidatePath("/admin/disputes");
    return {
      message:
        result.outcome === "released"
          ? "Milestone released — the final 50% payout is queued."
          : "Dispute rejected — the organizer's confirmation stands.",
    };
  } catch (error) {
    return toState(error);
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import {
  PowError,
  becomeHiringPartner,
  createEndorsement,
  requestIntroduction,
  respondToIntroduction,
  setEndorsementVisibility,
} from "@/services/pow/service";

export interface PowActionState {
  error?: string;
  message?: string;
}

function toState(error: unknown): PowActionState {
  if (error instanceof PowError) return { error: error.message };
  console.error("[pow] action failed", error);
  return { error: "Something went wrong — try again in a moment." };
}

// ── Judge endorsements ───────────────────────────────────────────────────

const endorsementSchema = z.object({
  developerId: z.string().cuid(),
  eventId: z.string().cuid(),
  quote: z
    .string()
    .trim()
    .min(20, "Endorsements need at least 20 characters — make them count.")
    .max(500),
});

export async function endorseWinnerAction(
  _prev: PowActionState,
  formData: FormData
): Promise<PowActionState> {
  const user = await requireUser();
  const parsed = endorsementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the endorsement and try again." };
  }

  try {
    await createEndorsement({ judgeId: user.id, ...parsed.data });
    const developer = await prisma.user.findUnique({
      where: { id: parsed.data.developerId },
      select: { handle: true },
    });
    if (developer) revalidatePath(`/developers/${developer.handle}`);
    return { message: "Endorsement published on their profile." };
  } catch (error) {
    return toState(error);
  }
}

export async function toggleEndorsementVisibilityAction(
  endorsementId: string,
  visible: boolean
): Promise<void> {
  const user = await requireUser();
  try {
    await setEndorsementVisibility(endorsementId, user.id, visible);
    revalidatePath(`/developers/${user.handle}`);
    revalidatePath("/dashboard/profile");
  } catch (error) {
    console.error("[pow] visibility toggle failed", error);
  }
}

// ── Hiring partners ──────────────────────────────────────────────────────

export async function becomeHiringPartnerAction(
  _prev: PowActionState,
  formData: FormData
): Promise<PowActionState> {
  const user = await requireUser();
  const company = z
    .string()
    .trim()
    .min(2, "Your company name is required.")
    .max(80)
    .safeParse(String(formData.get("companyName") ?? ""));
  if (!company.success) return { error: company.error.issues[0]?.message };

  try {
    await becomeHiringPartner(user.id, company.data);
    revalidatePath("/dashboard");
    return { message: "You're a hiring partner — verified winners are one click away." };
  } catch (error) {
    return toState(error);
  }
}

// ── Introductions ────────────────────────────────────────────────────────

const introSchema = z.object({
  developerId: z.string().cuid(),
  eventId: z.string().cuid(),
  message: z
    .string()
    .trim()
    .min(20, "Say what you're offering — at least 20 characters.")
    .max(1000),
});

export async function requestIntroductionAction(
  _prev: PowActionState,
  formData: FormData
): Promise<PowActionState> {
  const user = await requireUser();
  const parsed = introSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the request and try again." };
  }

  try {
    await requestIntroduction({ partnerId: user.id, ...parsed.data });
    revalidatePath("/hiring/requests");
    return { message: "Intro requested — the developer has your message." };
  } catch (error) {
    return toState(error);
  }
}

export async function respondToIntroductionAction(
  introductionId: string,
  accept: boolean
): Promise<PowActionState> {
  const user = await requireUser();
  try {
    await respondToIntroduction(introductionId, user.id, accept);
    revalidatePath("/dashboard/intros");
    return { message: accept ? "Accepted — contact details exchanged." : "Declined." };
  } catch (error) {
    return toState(error);
  }
}

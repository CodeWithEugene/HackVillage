"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/ports/mail";
import { kybSubmittedEmail } from "@/lib/notifications/templates/organizations";
import { DepositError, initiateDeposit } from "@/services/escrow/deposits";

export interface EscrowActionState {
  error?: string;
  message?: string;
}

/**
 * Organizer starts the Prize Vault deposit. The service does every check
 * (org admin, event state, KYB, remaining pool) — this action just routes
 * the user to the checkout and renders service errors.
 */
export async function initiateDepositAction(
  _prev: EscrowActionState,
  formData: FormData
): Promise<EscrowActionState> {
  const eventId = String(formData.get("eventId") ?? "");
  const user = await requireUser();
  try {
    const { checkoutUrl } = await initiateDeposit(eventId, user.id);
    revalidatePath(`/organizer/hackathons/${eventId}/vault`);
    redirect(checkoutUrl);
  } catch (error) {
    if (error instanceof DepositError) {
      if (error.code === "KYB_REQUIRED") {
        return {
          error: "KYB_REQUIRED",
        };
      }
      return { error: error.message };
    }
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("[escrow] initiateDeposit failed", error);
    return { error: "We couldn't start the deposit. Try again in a moment." };
  }
}

/** Organizer (org admin) requests business verification (KYB). */
export async function requestKybAction(
  _prev: EscrowActionState,
  formData: FormData
): Promise<EscrowActionState> {
  const user = await requireUser();
  const orgId = String(formData.get("orgId") ?? "");

  const membership = await prisma.orgMember.findFirst({
    where: { orgId, userId: user.id, status: "ACTIVE", role: { in: ["OWNER", "ADMIN"] } },
  });
  if (!membership) return { error: "Only organization admins can request KYB." };

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return { error: "Organization not found." };
  if (org.kycStatus === "VERIFIED") return { error: "Your organization is already verified." };

  await prisma.organization.update({ where: { id: orgId }, data: { kycStatus: "PENDING" } });
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "kyc.requested",
      entity: "Organization",
      entityId: orgId,
    },
  });

  await sendMail({ to: user.email, ...kybSubmittedEmail(org.name) });

  revalidatePath("/organizer");
  return { message: "Request sent. Platform staff review within 48 hours." };
}

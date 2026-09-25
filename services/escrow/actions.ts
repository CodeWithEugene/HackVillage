"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/guards";
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

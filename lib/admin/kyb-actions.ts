"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/guards";
import { decideKyb, KybDecisionError } from "@/lib/orgs/verification-service";
import { sendMail } from "@/lib/ports/mail";
import { kybApprovedEmail, kybRejectedEmail } from "@/lib/notifications/templates/organizations";
import { appUrl } from "@/lib/url";

export interface KybDecisionState {
  error?: string;
}

/**
 * Admin KYB decisions (plan §14.1: admin overrides require a reason, logged
 * to the append-only AuditLog). Paystack-automated KYB replaces the manual
 * review at go-live (Phase 9) — the interface stays identical. The decision
 * itself (with its PENDING precondition) lives in decideKyb.
 */
export async function decideKybAction(
  _prev: KybDecisionState,
  formData: FormData
): Promise<KybDecisionState> {
  const admin = await requireUser();

  const orgId = String(formData.get("orgId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (decision !== "APPROVE" && decision !== "REJECT") {
    return { error: "Choose approve or reject." };
  }
  if (decision === "REJECT" && reason.length < 4) {
    return { error: "A rejection needs a reason the organizer can act on." };
  }

  let outcome: { orgName: string; ownerEmail: string };
  try {
    outcome = await decideKyb({ adminId: admin.id, orgId, decision, reason });
  } catch (error) {
    if (error instanceof KybDecisionError) return { error: error.message };
    console.error(`[admin] KYB decision failed (org=${orgId})`, error);
    return { error: "We couldn't record the decision. Please try again." };
  }

  const template =
    decision === "APPROVE"
      ? kybApprovedEmail(outcome.orgName, appUrl("/organizer"))
      : kybRejectedEmail(outcome.orgName, reason);
  // The decision is committed — a mail failure must not fail the action.
  await sendMail({ to: outcome.ownerEmail, ...template }).catch((error: unknown) =>
    console.error(`[admin] KYB outcome email failed (org=${orgId})`, error)
  );

  revalidatePath("/admin/kyb");
  return {};
}

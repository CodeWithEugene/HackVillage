"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/ports/mail";
import { kybApprovedEmail, kybRejectedEmail } from "@/lib/notifications/templates/organizations";
import { appUrl } from "@/lib/url";

export interface KybDecisionState {
  error?: string;
}

/**
 * Admin KYB decisions (plan §14.1: admin overrides require a reason, logged
 * to the append-only AuditLog). Paystack-automated KYB replaces the manual
 * review at go-live (Phase 9) — the interface stays identical.
 */
export async function decideKybAction(
  _prev: KybDecisionState,
  formData: FormData
): Promise<KybDecisionState> {
  const admin = await requireUser();
  if (!admin.roles.includes("ADMIN")) return { error: "Admins only." };

  const orgId = String(formData.get("orgId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (decision !== "APPROVE" && decision !== "REJECT") {
    return { error: "Choose approve or reject." };
  }
  if (decision === "REJECT" && reason.length < 4) {
    return { error: "A rejection needs a reason the organizer can act on." };
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { owner: { select: { email: true } } },
  });
  if (!org) return { error: "Organization not found." };

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: orgId },
      data: { kycStatus: decision === "APPROVE" ? "VERIFIED" : "FAILED" },
    }),
    // Organizations that asked before structured submissions have no row; updateMany skips them.
    prisma.kybSubmission.updateMany({
      where: { orgId },
      data: { reviewedAt: new Date(), reviewNote: reason || null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: decision === "APPROVE" ? "kyc.approved" : "kyc.rejected",
        entity: "Organization",
        entityId: orgId,
        reason: reason || null,
      },
    }),
  ]);

  if (decision === "APPROVE") {
    await sendMail({ to: org.owner.email, ...kybApprovedEmail(org.name, appUrl("/organizer")) });
  } else {
    await sendMail({ to: org.owner.email, ...kybRejectedEmail(org.name, reason) });
  }

  revalidatePath("/admin/kyb");
  return {};
}

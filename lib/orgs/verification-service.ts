import { prisma } from "@/lib/db";
import { isOrgKind } from "@/lib/orgs/details";
import { canSubmitKyb, parseKybSubmission } from "@/lib/orgs/kyb";
import { sendMail } from "@/lib/ports/mail";
import { kybSubmittedEmail } from "@/lib/notifications/templates/organizations";

export class KybSubmissionError extends Error {}

export class KybDecisionError extends Error {}

/**
 * Admin KYB decision (the other half of submitKyb). Decisions are only valid
 * while the organization is actually awaiting review — deciding a VERIFIED or
 * FAILED org again would clobber the earlier audited outcome and re-mail the
 * organizer, so anything but PENDING is refused. Returns what the caller
 * needs for the outcome email.
 */
export async function decideKyb(input: {
  adminId: string;
  orgId: string;
  decision: "APPROVE" | "REJECT";
  reason: string;
}): Promise<{ orgName: string; ownerEmail: string }> {
  const admin = await prisma.roleGrant.findFirst({
    where: { userId: input.adminId, role: "ADMIN" },
    select: { id: true },
  });
  if (!admin) throw new KybDecisionError("Admins only.");

  const org = await prisma.organization.findUnique({
    where: { id: input.orgId },
    select: { name: true, kycStatus: true, owner: { select: { email: true } } },
  });
  if (!org) throw new KybDecisionError("Organization not found.");
  if (org.kycStatus !== "PENDING") {
    throw new KybDecisionError(
      "That organization isn't awaiting review. Refresh and take the next pending one."
    );
  }

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: input.orgId },
      data: { kycStatus: input.decision === "APPROVE" ? "VERIFIED" : "FAILED" },
    }),
    // Organizations that asked before structured submissions have no row; updateMany skips them.
    prisma.kybSubmission.updateMany({
      where: { orgId: input.orgId },
      data: { reviewedAt: new Date(), reviewNote: input.reason || null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: input.adminId,
        action: input.decision === "APPROVE" ? "kyc.approved" : "kyc.rejected",
        entity: "Organization",
        entityId: input.orgId,
        reason: input.reason || null,
      },
    }),
  ]);

  return { orgName: org.name, ownerEmail: org.owner.email };
}

/**
 * An organization's owner or admin submits its business details for review.
 * Moves the organization to PENDING; a later decision sets VERIFIED or FAILED.
 */
export async function submitKyb(
  actorId: string,
  orgId: string,
  input: Record<string, unknown>,
): Promise<void> {
  const membership = await prisma.orgMember.findFirst({
    where: { orgId, userId: actorId, status: "ACTIVE", role: { in: ["OWNER", "ADMIN"] } },
    select: {
      user: { select: { email: true } },
      org: { select: { name: true, kind: true, kycStatus: true } },
    },
  });
  if (!membership) {
    throw new KybSubmissionError("Only organization owners and admins can submit verification.");
  }

  const { org } = membership;
  if (org.kycStatus === "VERIFIED")
    throw new KybSubmissionError("Your organization is already verified.");
  if (!canSubmitKyb(org.kycStatus)) {
    throw new KybSubmissionError(
      "Your details are in review. We'll email you as soon as there's a decision.",
    );
  }
  if (!isOrgKind(org.kind)) {
    throw new KybSubmissionError("Add your organization details on your profile first.");
  }

  const parsed = parseKybSubmission(input, org.kind);
  if (!parsed.ok) throw new KybSubmissionError(parsed.error);

  const submission = { ...parsed.data, submittedById: actorId, submittedAt: new Date() };
  await prisma.$transaction([
    prisma.kybSubmission.upsert({
      where: { orgId },
      create: { orgId, ...submission },
      // A resubmission starts a fresh review.
      update: { ...submission, reviewedAt: null, reviewNote: null },
    }),
    prisma.organization.update({ where: { id: orgId }, data: { kycStatus: "PENDING" } }),
    prisma.auditLog.create({
      data: {
        actorId,
        action: "kyc.requested",
        entity: "Organization",
        entityId: orgId,
        meta: { resubmission: org.kycStatus === "FAILED" },
      },
    }),
  ]);

  await sendMail({ to: membership.user.email, ...kybSubmittedEmail(org.name) }).catch(
    (error: unknown) => console.error(`[orgs] KYB receipt email failed (org=${orgId})`, error),
  );
}

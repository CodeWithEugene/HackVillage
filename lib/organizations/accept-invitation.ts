import { prisma } from "@/lib/db";

/**
 * Accepting an organization invitation — the single path shared by
 * join-by-code (onboarding) and /invites/[token] (existing users).
 *
 * Claim-first: the invitation is flipped to accepted inside the transaction
 * by a conditional updateMany, so two concurrent accepts can't both win —
 * exactly one membership results, the loser gets an error.
 *
 * Email binding: invites emailed to a specific invitee only work for that
 * address (forwarded links/codes fail). Hand-shared codes are created with
 * the *creator's* own email (see createOrgInviteAction); the creator is
 * already an active member, so a stored email that belongs to an active
 * member of the org means "share by hand" and carries no email binding.
 */
export type AcceptInvitationResult =
  | { ok: true; orgId: string }
  | { ok: false; error: string };

const INVALID_INVITE = "That invite isn't valid anymore. Ask the organizer for a fresh one.";

export async function acceptOrgInvitation(input: {
  token: string;
  user: { id: string; email: string };
}): Promise<AcceptInvitationResult> {
  const invitation = await prisma.orgInvitation.findUnique({
    where: { token: input.token },
  });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: INVALID_INVITE };
  }

  const storedEmailIsMembers = await prisma.orgMember.findFirst({
    where: {
      orgId: invitation.orgId,
      status: "ACTIVE",
      user: { email: { equals: invitation.email, mode: "insensitive" } },
    },
    select: { id: true },
  });
  const targeted = !storedEmailIsMembers;
  if (targeted && invitation.email.toLowerCase() !== input.user.email.toLowerCase()) {
    return { ok: false, error: "That invite was sent to a different email address." };
  }

  return prisma.$transaction(async (tx) => {
    // Claim first — only one concurrent accept can flip acceptedAt.
    const claim = await tx.orgInvitation.updateMany({
      where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      data: { acceptedAt: new Date() },
    });
    if (claim.count === 0) return { ok: false as const, error: INVALID_INVITE };

    const existing = await tx.orgMember.findFirst({
      where: { orgId: invitation.orgId, userId: input.user.id },
    });
    if (!existing) {
      await tx.orgMember.create({
        data: {
          orgId: invitation.orgId,
          userId: input.user.id,
          role: invitation.role,
          status: "ACTIVE",
        },
      });
    } else if (existing.status === "REVOKED") {
      await tx.orgMember.update({
        where: { id: existing.id },
        data: { status: "ACTIVE", role: invitation.role },
      });
    }
    await tx.roleGrant.upsert({
      where: { userId_role: { userId: input.user.id, role: "ORGANIZER" } },
      create: { userId: input.user.id, role: "ORGANIZER" },
      update: {},
    });
    await tx.user.update({
      where: { id: input.user.id },
      data: { primaryRole: "ORGANIZER", onboardingCompletedAt: new Date() },
    });
    return { ok: true as const, orgId: invitation.orgId };
  });
}

import { prisma } from "@/lib/db";
import { canEditOrgProfile, parseOrgProfile } from "@/lib/orgs/profile";

export class OrgProfileError extends Error {}

interface OrgProfileInput {
  about: unknown;
  name?: unknown;
}

/**
 * An organization's owner or admin edits its public profile. The name is
 * locked once KYB verifies the organization (HackVillage checked that name).
 */
export async function updateOrgProfileAsMember(
  actorId: string,
  orgId: string,
  input: OrgProfileInput,
): Promise<void> {
  const membership = await prisma.orgMember.findFirst({
    where: { orgId, userId: actorId, status: "ACTIVE" },
    select: { role: true, org: { select: { kycStatus: true } } },
  });
  if (!membership || !canEditOrgProfile(membership.role)) {
    throw new OrgProfileError("Only organization owners and admins can edit the profile.");
  }

  const parsed = parseOrgProfile(input, {
    allowNameChange: membership.org.kycStatus !== "VERIFIED",
  });
  if (!parsed.ok) throw new OrgProfileError(parsed.error);

  await prisma.$transaction([
    prisma.organization.update({ where: { id: orgId }, data: parsed.data }),
    prisma.auditLog.create({
      data: {
        actorId,
        action: "org.profile_updated",
        entity: "Organization",
        entityId: orgId,
        meta: { fields: Object.keys(parsed.data), by: "organizer" },
      },
    }),
  ]);
}

/**
 * The HackVillage team fills in or corrects an organizer's profile. Admins
 * can always change the name (for example to match KYB documents), and every
 * edit carries a reason in the append-only audit log.
 */
export async function updateOrgProfileAsAdmin(
  adminId: string,
  orgId: string,
  input: OrgProfileInput,
  reason: string,
): Promise<void> {
  const admin = await prisma.roleGrant.findUnique({
    where: { userId_role: { userId: adminId, role: "ADMIN" } },
    select: { userId: true },
  });
  if (!admin) throw new OrgProfileError("Admins only.");

  const trimmedReason = reason.trim();
  if (trimmedReason.length < 4) throw new OrgProfileError("Add a reason for the audit log.");

  const parsed = parseOrgProfile(input, { allowNameChange: true });
  if (!parsed.ok) throw new OrgProfileError(parsed.error);

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } });
  if (!org) throw new OrgProfileError("Organization not found.");

  await prisma.$transaction([
    prisma.organization.update({ where: { id: orgId }, data: parsed.data }),
    prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: "org.profile_updated",
        entity: "Organization",
        entityId: orgId,
        reason: trimmedReason,
        meta: { fields: Object.keys(parsed.data), by: "admin" },
      },
    }),
  ]);
}

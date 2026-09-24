"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { currentUser, requireUser } from "@/lib/auth/guards";
import { validateHandle } from "@/lib/auth/handles";
import { generateInviteCode, inviteExpiryFrom } from "@/lib/organizations/invitations";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/ports/mail";
import { orgInviteEmail, orgMemberJoinedEmail } from "@/lib/notifications/templates/organizations";
import { appUrl } from "@/lib/url";

async function notifyOwnerOfNewMember(orgId: string, memberName: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, owner: { select: { email: true } } },
  });
  if (!org) return;
  await sendMail({ to: org.owner.email, ...orgMemberJoinedEmail(memberName, org.name) });
}

/**
 * Onboarding server actions (Phase 1). All actions verify the session and
 * re-verify role state server-side — the client proves nothing.
 */

export interface OnboardingActionState {
  error?: string;
  message?: string;
}

// ── Role selection ───────────────────────────────────────────────────────

export async function chooseRoleAction(role: "DEVELOPER" | "ORGANIZER"): Promise<void> {
  const user = await requireUser();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { primaryRole: role } });
    await tx.roleGrant.upsert({
      where: { userId_role: { userId: user.id, role } },
      create: { userId: user.id, role },
      update: {},
    });
  });

  redirect(role === "DEVELOPER" ? "/onboarding/developer" : "/onboarding/organizer");
}

// ── Developer onboarding ────────────────────────────────────────────────

const developerProfileSchema = z.object({
  headline: z
    .string()
    .trim()
    .min(4, "Add a short headline — e.g. “Full-stack developer, React & Node”.")
    .max(120),
  bio: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(80).optional(),
  skills: z.string().trim().max(200).optional(),
  githubLogin: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v === "" ? undefined : v?.replace(/^@/, ""))),
  linkedinUrl: z
    .string()
    .trim()
    .url("The LinkedIn URL must be a full link.")
    .max(300)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
});

export async function completeDeveloperOnboardingAction(
  _prev: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const user = await requireUser();
  const parsed = developerProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const skills = (parsed.data.skills ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);

  await prisma.$transaction(async (tx) => {
    await tx.developerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        headline: parsed.data.headline,
        bio: parsed.data.bio || null,
        location: parsed.data.location || null,
        skills,
        githubLogin: parsed.data.githubLogin ?? null,
        linkedinUrl: parsed.data.linkedinUrl ?? null,
      },
      update: {
        headline: parsed.data.headline,
        bio: parsed.data.bio || null,
        location: parsed.data.location || null,
        skills,
        githubLogin: parsed.data.githubLogin ?? null,
        linkedinUrl: parsed.data.linkedinUrl ?? null,
      },
    });
    await tx.roleGrant.upsert({
      where: { userId_role: { userId: user.id, role: "DEVELOPER" } },
      create: { userId: user.id, role: "DEVELOPER" },
      update: {},
    });
    await tx.user.update({
      where: { id: user.id },
      data: { primaryRole: "DEVELOPER", onboardingCompletedAt: new Date() },
    });
  });

  redirect("/dashboard");
}

// ── Organizer onboarding ────────────────────────────────────────────────

const createOrgSchema = z.object({
  name: z.string().trim().min(2, "Give your organization a name.").max(80),
  about: z.string().trim().max(2000).optional(),
});

const RESERVED_ORG_SLUGS = new Set([
  "admin", "api", "auth", "dashboard", "developers", "events", "hiring", "judge",
  "organizer", "orgs", "settings", "signin", "signup", "support", "trust",
]);

function slugifyStem(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

async function uniqueOrgSlug(name: string): Promise<string | null> {
  const stem = slugifyStem(name);
  if (stem.length < 3 || RESERVED_ORG_SLUGS.has(stem)) return null;
  const candidates = [stem, ...Array.from({ length: 20 }, (_, i) => `${stem}-${i + 2}`)];
  const taken = await prisma.organization.findMany({
    where: { slug: { in: candidates, mode: "insensitive" } },
    select: { slug: true },
  });
  const takenSet = new Set(taken.map((t) => t.slug.toLowerCase()));
  return candidates.find((c) => !takenSet.has(c)) ?? null;
}

export async function createOrganizationAction(
  _prev: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const user = await requireUser();
  const parsed = createOrgSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const existingMembership = await prisma.orgMember.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    select: { orgId: true },
  });
  if (existingMembership) {
    return { error: "You already belong to an organization. Leave it before creating another." };
  }

  const slug = await uniqueOrgSlug(parsed.data.name);
  if (!slug) {
    return { error: "That name doesn't produce a usable address — try different words." };
  }

  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: parsed.data.name,
        slug,
        about: parsed.data.about || null,
        ownerId: user.id,
      },
    });
    await tx.orgMember.create({
      data: { orgId: org.id, userId: user.id, role: "OWNER", status: "ACTIVE" },
    });
    await tx.roleGrant.upsert({
      where: { userId_role: { userId: user.id, role: "ORGANIZER" } },
      create: { userId: user.id, role: "ORGANIZER" },
      update: {},
    });
    await tx.user.update({
      where: { id: user.id },
      data: { primaryRole: "ORGANIZER", onboardingCompletedAt: new Date() },
    });
  });

  redirect("/organizer");
}

export async function joinOrganizationAction(
  _prev: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const user = await requireUser();
  const code = z
    .string()
    .trim()
    .min(6)
    .max(10)
    .safeParse(String(formData.get("code") ?? ""));
  if (!code.success) return { error: "Invite codes are the short codes organizers share." };

  const invitation = await prisma.orgInvitation.findUnique({ where: { token: code.data } });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt.getTime() <= Date.now()) {
    return { error: "That invite isn't valid anymore. Ask the organizer for a fresh one." };
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.orgMember.findFirst({
      where: { orgId: invitation.orgId, userId: user.id },
    });
    if (!existing) {
      await tx.orgMember.create({
        data: { orgId: invitation.orgId, userId: user.id, role: invitation.role, status: "ACTIVE" },
      });
    } else if (existing.status === "REVOKED") {
      await tx.orgMember.update({
        where: { id: existing.id },
        data: { status: "ACTIVE", role: invitation.role },
      });
    }
    await tx.orgInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
    await tx.roleGrant.upsert({
      where: { userId_role: { userId: user.id, role: "ORGANIZER" } },
      create: { userId: user.id, role: "ORGANIZER" },
      update: {},
    });
    await tx.user.update({
      where: { id: user.id },
      data: { primaryRole: "ORGANIZER", onboardingCompletedAt: new Date() },
    });
  });

  await notifyOwnerOfNewMember(invitation.orgId, user.name ?? user.email);

  redirect("/organizer");
}

/**
 * Organizer-side: generate a fresh invite code for their org. When an
 * invitee email is given, the invite is emailed to them directly; left
 * blank, the code is still created for the organizer to share by hand.
 */
export async function createOrgInviteAction(inviteeEmail?: string): Promise<void> {
  const user = await currentUser();
  if (!user?.roles.includes("ORGANIZER")) return;

  const membership = await prisma.orgMember.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    select: { orgId: true, role: true },
  });
  if (!membership || membership.role === "MEMBER") return;

  const trimmedEmail = inviteeEmail?.trim();
  const token = generateInviteCode();

  const [org] = await prisma.$transaction([
    prisma.organization.findUnique({ where: { id: membership.orgId }, select: { name: true } }),
    prisma.orgInvitation.create({
      data: {
        orgId: membership.orgId,
        email: trimmedEmail || user.email,
        role: "MEMBER",
        token,
        expiresAt: inviteExpiryFrom(),
      },
    }),
  ]);

  if (trimmedEmail && org) {
    await sendMail({
      to: trimmedEmail,
      ...orgInviteEmail(org.name, appUrl(`/invites/${token}`)),
    });
  }

  revalidatePath("/organizer");
}

/** Logged-in users accepting an invite link directly (/invites/[token]). */
export async function acceptInvitationTokenAction(token: string): Promise<void> {
  const user = await requireUser();
  const invitation = await prisma.orgInvitation.findUnique({ where: { token } });
  if (
    !invitation ||
    invitation.acceptedAt ||
    invitation.expiresAt.getTime() <= Date.now()
  ) {
    redirect("/invites/invalid");
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.orgMember.findFirst({
      where: { orgId: invitation.orgId, userId: user.id },
    });
    if (!existing) {
      await tx.orgMember.create({
        data: { orgId: invitation.orgId, userId: user.id, role: invitation.role, status: "ACTIVE" },
      });
    } else if (existing.status === "REVOKED") {
      await tx.orgMember.update({
        where: { id: existing.id },
        data: { status: "ACTIVE", role: invitation.role },
      });
    }
    await tx.orgInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
    await tx.roleGrant.upsert({
      where: { userId_role: { userId: user.id, role: "ORGANIZER" } },
      create: { userId: user.id, role: "ORGANIZER" },
      update: {},
    });
  });

  await notifyOwnerOfNewMember(invitation.orgId, user.name ?? user.email);

  redirect("/organizer");
}

// ── Developer profile (settings reuses the same shape) ─────────────────

const profileUpdateSchema = developerProfileSchema.extend({
  handle: z.string().trim().min(3).max(30),
  visible: z
    .string()
    .optional()
    .transform((v) => v === "on"),
});

export async function updateDeveloperProfileAction(
  _prev: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const user = await requireUser();
  const parsed = profileUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { headline, bio, location, skills, githubLogin, linkedinUrl, handle, visible } = parsed.data;

  const handleError = validateHandle(handle);
  if (handleError) return { error: handleError };

  const taken = await prisma.user.findFirst({
    where: { handle: { equals: handle, mode: "insensitive" }, id: { not: user.id } },
    select: { id: true },
  });
  if (taken) return { error: "That handle is taken — try another." };

  const skillList = (skills ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { handle } }),
    prisma.developerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        headline,
        bio: bio || null,
        location: location || null,
        skills: skillList,
        githubLogin: githubLogin ?? null,
        linkedinUrl: linkedinUrl ?? null,
        visible,
      },
      update: {
        headline,
        bio: bio || null,
        location: location || null,
        skills: skillList,
        githubLogin: githubLogin ?? null,
        linkedinUrl: linkedinUrl ?? null,
        visible,
      },
    }),
  ]);

  revalidatePath("/dashboard/profile");
  revalidatePath(`/developers/${handle}`);
  return { message: "Profile saved." };
}

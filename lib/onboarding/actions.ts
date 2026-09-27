"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { validateHandle } from "@/lib/auth/handles";
import { acceptOrgInvitation } from "@/lib/organizations/accept-invitation";
import { generateInviteCode, inviteExpiryFrom } from "@/lib/organizations/invitations";
import { createWithOrgSlugRetry, freeOrgSlugCandidates } from "@/lib/organizations/slug";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { sendMail } from "@/lib/ports/mail";
import { orgInviteEmail, orgMemberJoinedEmail } from "@/lib/notifications/templates/organizations";
import { appUrl } from "@/lib/url";
import { parseOrgDetails } from "@/lib/orgs/details";

/**
 * Post-commit notice to the org owner. The membership is already saved, so a
 * mail failure must never bubble up and fail the action — log only.
 */
async function notifyOwnerOfNewMember(orgId: string, memberName: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, owner: { select: { email: true } } },
  });
  if (!org) return;
  await sendMail({ to: org.owner.email, ...orgMemberJoinedEmail(memberName, org.name) }).catch(
    (error: unknown) => console.error(`[onboarding] owner-join notice failed (org=${orgId})`, error)
  );
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

// Server actions receive untrusted input — validate even "typed" params at runtime.
const roleChoiceSchema = z.enum(["DEVELOPER", "ORGANIZER"]);

export async function chooseRoleAction(role: "DEVELOPER" | "ORGANIZER"): Promise<void> {
  const parsedRole = roleChoiceSchema.parse(role);
  const user = await requireUser();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { primaryRole: parsedRole } });
    await tx.roleGrant.upsert({
      where: { userId_role: { userId: user.id, role: parsedRole } },
      create: { userId: user.id, role: parsedRole },
      update: {},
    });
  });

  redirect(parsedRole === "DEVELOPER" ? "/onboarding/developer" : "/onboarding/organizer");
}

// ── Developer onboarding ────────────────────────────────────────────────

const developerProfileSchema = z.object({
  headline: z
    .string()
    .trim()
    .min(4, "Add a short headline, e.g. “Full-stack developer, React & Node”.")
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

function orgDetailsInput(formData: FormData) {
  return {
    kind: formData.get("kind"),
    city: formData.get("city"),
    country: formData.get("country"),
    website: formData.get("website"),
    socialUrl: formData.get("socialUrl"),
    contactPhone: formData.get("contactPhone"),
  };
}

export async function createOrganizationAction(
  _prev: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const user = await requireUser();
  const parsed = createOrgSchema.safeParse({
    name: formData.get("name"),
    about: formData.get("about") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const details = parseOrgDetails(orgDetailsInput(formData));
  if (!details.ok) return { error: details.error };

  const existingMembership = await prisma.orgMember.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    select: { orgId: true },
  });
  if (existingMembership) {
    return { error: "You already belong to an organization. Leave it before creating another." };
  }

  const candidates = await freeOrgSlugCandidates(parsed.data.name);
  if (candidates.length === 0) {
    return { error: "That name doesn't produce a usable address. Try different words." };
  }

  try {
    // A concurrent signup can claim the pre-checked slug — retry the next
    // candidates on the unique violation instead of erroring out.
    await createWithOrgSlugRetry(candidates, (slug) =>
      prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: parsed.data.name,
            slug,
            about: parsed.data.about || null,
            ...details.data,
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
      })
    );
  } catch (error) {
    console.error("[onboarding] organization create failed after slug retries", error);
    return { error: "That name is taken too often right now. Adjust it slightly." };
  }

  redirect("/organizer/verification?welcome=1");
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

  const accepted = await acceptOrgInvitation({
    token: code.data,
    user: { id: user.id, email: user.email },
  });
  if (!accepted.ok) return { error: accepted.error };

  await notifyOwnerOfNewMember(accepted.orgId, user.name ?? user.email);

  redirect("/organizer");
}

/**
 * Organizer-side: generate a fresh invite code for their org. When an
 * invitee email is given, the invite is emailed to them directly; left
 * blank, the code is still created for the organizer to share by hand.
 */
export async function createOrgInviteAction(
  inviteeEmail?: string
): Promise<OnboardingActionState> {
  const user = await requireUser();
  if (!user.roles.includes("ORGANIZER")) {
    return { error: "Only organizers can invite teammates." };
  }

  const membership = await prisma.orgMember.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    select: { orgId: true, role: true },
  });
  if (!membership || membership.role === "MEMBER") {
    return { error: "Only organization owners and admins can create invites." };
  }

  const trimmedEmail = inviteeEmail?.trim();
  let targetEmail: string | undefined;
  if (trimmedEmail) {
    const parsed = z.string().email().safeParse(trimmedEmail);
    if (!parsed.success) return { error: "That email doesn't look right." };
    targetEmail = parsed.data.toLowerCase();
  }

  // Per-organizer cap: invite codes grant real access, so bulk creation is
  // an abuse vector worth limiting even for legit organizers.
  const limit = await rateLimit(`org-invite:${membership.orgId}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return { error: "Too many invites created this hour. Try again a little later." };
  }

  const token = generateInviteCode();

  const [org] = await prisma.$transaction([
    prisma.organization.findUnique({ where: { id: membership.orgId }, select: { name: true } }),
    prisma.orgInvitation.create({
      data: {
        orgId: membership.orgId,
        // Targeted invites carry the invitee's address (acceptance is bound
        // to it); hand-shared codes store the creator's own — see
        // acceptOrgInvitation for how that's enforced.
        email: targetEmail ?? user.email,
        role: "MEMBER",
        token,
        expiresAt: inviteExpiryFrom(),
      },
    }),
  ]);

  if (targetEmail && org) {
    // The invite already exists — a mail failure must not 500 the action.
    await sendMail({
      to: targetEmail,
      ...orgInviteEmail(org.name, appUrl(`/invites/${token}`)),
    }).catch((error: unknown) => console.error("[onboarding] invite email failed", error));
  }

  revalidatePath("/organizer");
  return {};
}

/** Logged-in users accepting an invite link directly (/invites/[token]). */
export async function acceptInvitationTokenAction(token: string): Promise<void> {
  const user = await requireUser();

  const accepted = await acceptOrgInvitation({
    token,
    user: { id: user.id, email: user.email },
  });
  if (!accepted.ok) redirect("/invites/invalid");

  await notifyOwnerOfNewMember(accepted.orgId, user.name ?? user.email);

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

  const [taken, before] = await Promise.all([
    prisma.user.findFirst({
      where: { handle: { equals: handle, mode: "insensitive" }, id: { not: user.id } },
      select: { id: true },
    }),
    // The session's handle can be stale — read the current one so a rename
    // revalidates BOTH the old and the new public profile paths.
    prisma.user.findUnique({ where: { id: user.id }, select: { handle: true } }),
  ]);
  if (taken) return { error: "That handle is taken. Try another." };

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
  if (before?.handle && before.handle.toLowerCase() !== handle.toLowerCase()) {
    // The old public URL must drop the cached profile right away.
    revalidatePath(`/developers/${before.handle}`);
  }
  revalidatePath(`/developers/${handle}`);
  return { message: "Profile saved." };
}

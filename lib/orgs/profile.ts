import { z } from "zod";

/** Same limit as organizer onboarding, so a profile never outgrows its first draft's rules. */
export const ORG_ABOUT_MAX = 2000;

const aboutSchema = z
  .string({ message: "About must be text." })
  .trim()
  .max(ORG_ABOUT_MAX, `Keep the about text under ${ORG_ABOUT_MAX} characters.`);

const nameSchema = z
  .string({ message: "Name must be text." })
  .trim()
  .min(2, "Give your organization a name.")
  .max(80, "Keep the name under 80 characters.");

export interface OrgProfileUpdate {
  about: string | null;
  name?: string;
}

export type OrgProfileParseResult =
  { ok: true; data: OrgProfileUpdate } | { ok: false; error: string };

/**
 * Validates a public organizer profile edit. The name only changes when the
 * caller allows it: once KYB verifies an organization, its name is the one
 * HackVillage checked, so organizers can no longer change it themselves.
 */
export function parseOrgProfile(
  input: { about: unknown; name?: unknown },
  { allowNameChange = false }: { allowNameChange?: boolean } = {},
): OrgProfileParseResult {
  const about = aboutSchema.safeParse(input.about ?? "");
  if (!about.success) return { ok: false, error: about.error.issues[0].message };

  const data: OrgProfileUpdate = { about: about.data || null };
  if (allowNameChange && input.name !== undefined) {
    const name = nameSchema.safeParse(input.name);
    if (!name.success) return { ok: false, error: name.error.issues[0].message };
    data.name = name.data;
  }
  return { ok: true, data };
}

/** Owners and admins manage the organization's public profile; members don't. */
export function canEditOrgProfile(role: "OWNER" | "ADMIN" | "MEMBER"): boolean {
  return role === "OWNER" || role === "ADMIN";
}

"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/guards";
import {
  OrgProfileError,
  updateOrgProfileAsAdmin,
  updateOrgProfileAsMember,
} from "@/lib/orgs/service";

export interface OrgProfileState {
  error?: string;
  saved?: boolean;
}

function revalidateOrgSurfaces(): void {
  revalidatePath("/organizer");
  revalidatePath("/admin/organizations");
  // Every hackathon page shows its organizer card.
  revalidatePath("/hackathons", "layout");
}

const DETAIL_FIELDS = ["kind", "city", "country", "website", "socialUrl", "contactPhone"];

function profileInput(formData: FormData) {
  // The profile form always sends the details block; its presence is marked by "city".
  const details = formData.has("city")
    ? Object.fromEntries(DETAIL_FIELDS.map((field) => [field, formData.get(field) ?? undefined]))
    : undefined;
  return { about: formData.get("about"), name: formData.get("name") ?? undefined, details };
}

async function runProfileUpdate(
  orgId: string,
  update: () => Promise<void>,
): Promise<OrgProfileState> {
  try {
    await update();
  } catch (error) {
    if (error instanceof OrgProfileError) return { error: error.message };
    console.error(`[orgs] profile update failed (org=${orgId})`, error);
    return { error: "We couldn't save the profile. Please try again." };
  }
  revalidateOrgSurfaces();
  return { saved: true };
}

/** An organization's owner or admin edits its public profile. */
export async function updateOrgProfileAction(
  _prev: OrgProfileState,
  formData: FormData,
): Promise<OrgProfileState> {
  const user = await requireUser();
  const orgId = String(formData.get("orgId") ?? "");
  return runProfileUpdate(orgId, () =>
    updateOrgProfileAsMember(user.id, orgId, profileInput(formData)),
  );
}

/** The HackVillage team fills in or corrects an organizer's public profile. */
export async function adminUpdateOrgProfileAction(
  _prev: OrgProfileState,
  formData: FormData,
): Promise<OrgProfileState> {
  const admin = await requireUser();
  if (!admin.roles.includes("ADMIN")) return { error: "Admins only." };
  const orgId = String(formData.get("orgId") ?? "");
  const reason = String(formData.get("reason") ?? "");
  return runProfileUpdate(orgId, () =>
    updateOrgProfileAsAdmin(admin.id, orgId, profileInput(formData), reason),
  );
}

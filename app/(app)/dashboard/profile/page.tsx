import type { Metadata } from "next";

import { EditProfileForm } from "@/components/profile/edit-profile-form";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Your Profile" };

export default async function ProfileEditPage() {
  const user = await requireOnboardedUser();

  // Organizers without a developer profile get a starter one here.
  const profile = await prisma.developerProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, headline: "HackVillage participant" },
    update: {},
  });

  return <EditProfileForm handle={user.handle} defaults={profile} />;
}

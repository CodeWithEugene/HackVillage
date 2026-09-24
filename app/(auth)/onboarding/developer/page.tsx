import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DeveloperProfileForm } from "@/components/onboarding/developer-profile-form";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Developer onboarding" };

export default async function DeveloperOnboardingPage() {
  const user = await requireUser();
  if (user.onboardingCompletedAt && user.primaryRole === "DEVELOPER") {
    redirect("/dashboard");
  }

  const profile = await prisma.developerProfile.findUnique({ where: { userId: user.id } });

  return <DeveloperProfileForm name={user.name ?? ""} defaults={profile ?? undefined} />;
}

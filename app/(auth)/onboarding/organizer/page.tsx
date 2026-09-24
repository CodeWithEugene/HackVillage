import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OrganizerOnboardingForm } from "@/components/onboarding/organizer-onboarding-form";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Organizer onboarding" };

export default async function OrganizerOnboardingPage() {
  const user = await requireUser();
  if (user.onboardingCompletedAt && user.roles.includes("ORGANIZER")) {
    redirect("/organizer");
  }

  const membership = await prisma.orgMember.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    include: { org: { select: { name: true } } },
  });

  return (
    <OrganizerOnboardingForm
      name={user.name ?? ""}
      existingOrgName={membership?.org.name}
    />
  );
}

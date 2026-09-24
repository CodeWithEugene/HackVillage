import type { Metadata } from "next";
import { Building2, Code2 } from "lucide-react";

import { RoleChoiceCards } from "@/components/onboarding/role-choice-cards";
import { currentUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Choose Your Path" };

export default async function OnboardingChoosePage() {
  const user = await currentUser();
  if (!user) {
    return (
      <p className="text-center text-muted">
        Sign in first — then we&apos;ll set you up.
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-ink">How Will You Use HackVillage?</h1>
        <p className="mt-2 text-muted">
          Pick a starting point — you can add other roles anytime.
        </p>
      </header>
      <RoleChoiceCards currentRole={user.primaryRole} />
      <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted">
        <Building2 aria-hidden className="size-4" /> Organizers deposit prize pools and run events
        <span aria-hidden>·</span>
        <Code2 aria-hidden className="size-4" /> Developers win and get paid instantly
      </p>
    </div>
  );
}

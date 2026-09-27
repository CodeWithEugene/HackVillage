import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Code2, LogIn } from "lucide-react";

import { RoleChoiceCards } from "@/components/onboarding/role-choice-cards";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { currentUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Choose Your Path" };

export default async function OnboardingChoosePage() {
  const user = await currentUser();
  if (!user) {
    // Signed-out visitors get a real way forward, not a dead end. After
    // sign-in the auth flow returns unonboarded users to this page itself
    // (lib/auth/actions.ts), so no ?next= round-trip is needed.
    return (
      <Card className="mx-auto w-full max-w-md text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <LogIn aria-hidden className="size-5" /> Sign In To Choose Your Path
        </CardTitle>
        <CardDescription>
          Pick organizer or developer right after you sign in. We&apos;ll bring you straight back
          here.
        </CardDescription>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/signin">
            <Button arrow>Sign In</Button>
          </Link>
          <Link href="/signup">
            <Button variant="secondary">Create Account</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-ink">How Will You Use HackVillage?</h1>
        <p className="mt-2 text-muted">
          Pick a starting point, you can add other roles anytime.
        </p>
      </header>
      <RoleChoiceCards currentRole={user.primaryRole} />
      <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted">
        <Building2 aria-hidden className="size-4" /> Organizers deposit prize pools and run hackathons
        <span aria-hidden>·</span>
        <Code2 aria-hidden className="size-4" /> Developers win and get paid instantly
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/signup-form";
import { currentUser } from "@/lib/auth/guards";
import { parseSignUpRole } from "@/lib/auth/signup-links";

export const metadata: Metadata = { title: "Create Account" };

interface PageProps {
  searchParams: Promise<{ role?: string | string[] }>;
}

export default async function SignUpPage({ searchParams }: PageProps) {
  const role = parseSignUpRole((await searchParams).role);

  // Already signed in and here to host: skip sign-up and go straight to organizer setup.
  if (role === "ORGANIZER" && (await currentUser())) redirect("/onboarding/organizer");

  return (
    <SignUpForm
      initialRole={role}
      googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID)}
      githubEnabled={Boolean(process.env.GITHUB_CLIENT_ID)}
    />
  );
}

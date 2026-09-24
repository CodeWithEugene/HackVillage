import type { Metadata } from "next";

import { SignInForm } from "@/components/auth/signin-form";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  registered: "Account created — check your email for the verification link.",
  reset: "Password updated — sign in with your new password.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; reset?: string; error?: string }>;
}) {
  const params = await searchParams;
  const notice =
    (params.registered && NOTICES.registered) ||
    (params.reset && NOTICES.reset) ||
    (params.error && "Something went wrong with that sign-in — try again.");

  return (
    <SignInForm
      googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID)}
      githubEnabled={Boolean(process.env.GITHUB_CLIENT_ID)}
      notice={notice || undefined}
    />
  );
}

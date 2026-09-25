import type { Metadata } from "next";

import { OAuthPopupErrorRelay } from "@/components/auth/oauth-popup-pages";
import { SignInForm } from "@/components/auth/signin-form";

export const metadata: Metadata = { title: "Sign In" };

const NOTICES: Record<string, string> = {
  registered: "Account created, check your email for the verification link.",
  reset: "Password updated, sign in with your new password.",
};

const OAUTH_ERROR_NOTICES: Record<string, string> = {
  OAuthAccountNotLinked:
    "An account with that email already exists. Sign in with your password below instead.",
  AccessDenied:
    "That sign-in was cancelled or denied. Make sure your Google or GitHub account has a verified email address, then try again.",
  OAuthSignin: "We couldn't reach the sign-in provider. Please try again.",
  OAuthCallback: "The sign-in provider returned an unexpected response. Please try again.",
  Configuration: "Sign-in is temporarily misconfigured. Please try email and password instead.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; reset?: string; error?: string }>;
}) {
  const params = await searchParams;
  const notice = (params.registered && NOTICES.registered) || (params.reset && NOTICES.reset);
  const errorNotice =
    params.error &&
    (OAUTH_ERROR_NOTICES[params.error] ?? "Something went wrong with that sign-in, try again.");

  return (
    <>
      <OAuthPopupErrorRelay error={params.error} />
      <SignInForm
        googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID)}
        githubEnabled={Boolean(process.env.GITHUB_CLIENT_ID)}
        notice={notice || undefined}
        errorNotice={errorNotice || undefined}
      />
    </>
  );
}

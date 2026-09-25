/**
 * Google and GitHub sign-ins join an existing HackVillage account with the
 * same email (allowDangerousEmailAccountLinking). That is only safe when the
 * provider verified the email, so anything else is refused.
 */
export function oauthSignInAllowed(input: {
  provider: string | undefined;
  email: string | null | undefined;
  profile: { email_verified?: unknown } | undefined;
}): boolean {
  // GitHub's email already comes from its verified addresses (lib/auth/github-email.ts).
  if (input.provider === "github") return Boolean(input.email);
  if (input.provider === "google") return input.profile?.email_verified === true;
  return true;
}

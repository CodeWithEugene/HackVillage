/** One entry from GitHub's GET /user/emails. */
export interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

/**
 * The GitHub email we trust: the verified primary, else any verified one.
 * Unverified addresses are never used. GitHub sign-ins attach to an existing
 * HackVillage account with the same email, so an address someone merely
 * typed into GitHub must not count as theirs.
 */
export function pickVerifiedGithubEmail(emails: unknown): string | null {
  if (!Array.isArray(emails)) return null;
  const valid = emails.filter(
    (entry): entry is GithubEmail =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as GithubEmail).email === "string" &&
      (entry as GithubEmail).verified === true,
  );
  const chosen = valid.find((entry) => entry.primary) ?? valid[0];
  return chosen ? chosen.email.toLowerCase() : null;
}

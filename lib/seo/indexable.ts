import type { Prisma } from "@prisma/client";

/**
 * Accounts that exist for demos, tests, or security scanners, identified by
 * email domain: the seed's @hackvillage.dev users, test fixtures, and
 * reserved names like .invalid that no real inbox uses. Their profiles stay
 * reachable but are kept out of search engines and the sitemap.
 */
const NON_PUBLIC_DOMAINS = new Set([
  "hackvillage.dev",
  "hackvillage.test",
  "example.com",
  "example.org",
]);
const RESERVED_TLDS = [".invalid", ".test", ".example", ".localhost"];

export function isRealAccountEmail(email: string): boolean {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain) return false;
  if (NON_PUBLIC_DOMAINS.has(domain)) return false;
  return !RESERVED_TLDS.some((tld) => domain.endsWith(tld));
}

/**
 * A developer profile worth a search result: the builder has taken part in a
 * hackathon or has a portfolio item. Brand-new empty profiles are thin pages
 * that would weaken the site in search, so they wait until there's something
 * to show.
 */
export const INDEXABLE_DEVELOPER_WHERE = {
  deletedAt: null,
  profile: { isNot: null },
  OR: [{ registrations: { some: {} } }, { portfolioItems: { some: {} } }],
} satisfies Prisma.UserWhereInput;

export function isIndexableDeveloper(input: {
  email: string;
  registrationCount: number;
  portfolioCount: number;
}): boolean {
  return isRealAccountEmail(input.email) && input.registrationCount + input.portfolioCount > 0;
}

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

/**
 * Organization slugs: candidate generation plus collision-retry creation.
 * The pre-checked candidate list can still lose a race against a concurrent
 * create, so creation retries the next candidates on a P2002 slug violation
 * instead of surfacing a raw 500.
 */

const RESERVED_ORG_SLUGS = new Set([
  "admin", "api", "auth", "dashboard", "developers", "events", "hackathons", "hiring",
  "judge", "organizer", "orgs", "settings", "signin", "signup", "support", "trust",
]);

export function orgSlugStem(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

export function orgSlugCandidates(name: string): string[] {
  const stem = orgSlugStem(name);
  if (stem.length < 3 || RESERVED_ORG_SLUGS.has(stem)) return [];
  return [stem, ...Array.from({ length: 20 }, (_, i) => `${stem}-${i + 2}`)];
}

/** Candidates not taken at read time — creation still re-verifies via the retry below. */
export async function freeOrgSlugCandidates(name: string): Promise<string[]> {
  const candidates = orgSlugCandidates(name);
  if (candidates.length === 0) return [];
  const taken = await prisma.organization.findMany({
    where: { slug: { in: candidates, mode: "insensitive" } },
    select: { slug: true },
  });
  const takenSet = new Set(taken.map((t) => t.slug.toLowerCase()));
  return candidates.filter((candidate) => !takenSet.has(candidate));
}

export function isOrgSlugUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  const target = (error.meta as { target?: string[] } | undefined)?.target ?? [];
  return target.includes("slug");
}

/**
 * Try each candidate slug in order; a unique violation on slug moves to the
 * next candidate (bounded), any other error aborts immediately.
 */
export async function createWithOrgSlugRetry<T>(
  candidates: string[],
  create: (slug: string) => Promise<T>,
  maxAttempts = 5,
): Promise<T> {
  let lastError: unknown;
  for (const slug of candidates.slice(0, Math.max(1, maxAttempts))) {
    try {
      return await create(slug);
    } catch (error) {
      if (!isOrgSlugUniqueViolation(error)) throw error;
      lastError = error;
    }
  }
  throw lastError ?? new Error("No organization slug candidates available.");
}

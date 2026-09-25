/**
 * Submission + split declaration policy (ADR-013). Pure functions.
 */

export interface SplitEntry {
  userId: string;
  percent: number;
}

/**
 * The split declaration must cover only current team members, have no
 * duplicates, and sum to exactly 100 percent. Percent values are integers.
 */
export function validateSplit(
  split: SplitEntry[],
  memberIds: string[]
): { ok: boolean; reason?: string } {
  const members = new Set(memberIds);
  if (split.length === 0) return { ok: false, reason: "Declare how the prize splits between members." };

  const seen = new Set<string>();
  for (const entry of split) {
    if (!members.has(entry.userId)) {
      return { ok: false, reason: "The split includes someone who is not a member of the team." };
    }
    if (seen.has(entry.userId)) {
      return { ok: false, reason: "The split lists a member twice." };
    }
    seen.add(entry.userId);
    if (!Number.isInteger(entry.percent) || entry.percent < 0 || entry.percent > 100) {
      return { ok: false, reason: "Split percentages are whole numbers between 0 and 100." };
    }
  }

  const total = split.reduce((sum, entry) => sum + entry.percent, 0);
  if (total !== 100) {
    return { ok: false, reason: `Split percentages add up to ${total}, but they must total 100.` };
  }

  return { ok: true };
}

/** GitHub/GitLab/Bitbucket repo URLs (https only). */
export const REPO_URL_PATTERN =
  /^https:\/\/(github\.com|gitlab\.com|bitbucket\.org)\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/;

export function validRepoUrl(url: string): string | null {
  if (!REPO_URL_PATTERN.test(url.trim())) {
    return "Use the full https:// link to a GitHub, GitLab or Bitbucket repository.";
  }
  return null;
}

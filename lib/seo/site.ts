/**
 * Canonical site facts for every SEO/AEO surface: metadata, JSON-LD,
 * sitemap, robots.txt and llms.txt. Describing the "HackVillage" entity
 * identically everywhere is what lets search engines and AI engines connect
 * the website, the GitHub repo, and the social profiles as one thing.
 *
 * Keep these values in sync with components/patterns/site-footer.tsx.
 */

export const SITE_NAME = "HackVillage";

/** Helps "hack village" (two words) searches resolve to this entity. */
export const SITE_ALTERNATE_NAME = "Hack Village";

export const SITE_DESCRIPTION =
  "HackVillage is the open-source hackathon platform for Kenya and Africa: 100% of every prize pool is locked in escrow before the hackathon goes live, winners are paid 50% instantly, and every lock and payout is recorded on a public ledger.";

export const CONTACT_EMAIL = "info@hackvillage.xyz";

export const GITHUB_URL = "https://github.com/CodeWithEugene/HackVillage";

/** Paths (resolved to absolute URLs at render time). */
export const LOGO_PATH = "/branding/icon-512.png";
export const OG_IMAGE_PATH = "/branding/og.png";

/**
 * HackVillage's own profiles, declared as "the same entity" through
 * Organization schema `sameAs`. Only HackVillage's accounts belong here:
 * listing another organization would tell search engines HackVillage *is*
 * that organization.
 */
export const SAME_AS = [
  GITHUB_URL,
  "https://www.linkedin.com/company/hackvillage",
  "https://x.com/hackvillagexyz",
  "https://www.youtube.com/@hackvillage",
] as const;

/** HackVillage is a Technetium Kenya initiative (see the site footer). */
export const PARENT_ORGANIZATION = {
  name: "Technetium Kenya",
  url: "https://www.technetium.co.ke",
} as const;

/** Topics the entity should be associated with (schema.org knowsAbout). */
export const KNOW_ABOUT = [
  "hackathons",
  "hackathon prize escrow",
  "instant hackathon payouts",
  "Proof-of-Work developer portfolios",
  "hackathon judging",
  "open-source event infrastructure",
] as const;

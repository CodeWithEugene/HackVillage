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
 * Profiles that declare "same entity" to search engines via Organization
 * schema `sameAs`. Includes the backing organizations (Technetium Kenya,
 * Salamander Tech Hub) so the brand graph is connected on day one.
 */
export const SAME_AS = [
  GITHUB_URL,
  "https://www.linkedin.com/company/hackvillage",
  "https://x.com/hackvillagexyz",
  "https://www.youtube.com/@hackvillage",
  "https://www.technetium.co.ke",
  "https://salamandertechhub.com",
] as const;

/** Topics the entity should be associated with (schema.org knowAbout). */
export const KNOW_ABOUT = [
  "hackathons",
  "hackathon prize escrow",
  "instant hackathon payouts",
  "Proof-of-Work developer portfolios",
  "hackathon judging",
  "open-source event infrastructure",
] as const;

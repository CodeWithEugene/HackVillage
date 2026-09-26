import type { NextConfig } from "next";

/** Sections whose `/events` routes were renamed to `/hackathons`. */
const RENAMED_SECTIONS = ["", "/dashboard", "/organizer", "/judge", "/admin"];

/**
 * Crawlers that get <title> and <meta> tags in the initial <head> instead of
 * streamed into the body. Next.js's default list (copied here, since setting
 * this replaces it) covers link-preview bots and some search engines, but not
 * Googlebot or AI crawlers, and those that don't run JavaScript can miss
 * streamed tags. Real visitors keep streaming, so pages stay fast.
 */
const HTML_LIMITED_BOTS = new RegExp(
  [
    // Next.js 15.5 defaults
    "[\\w-]+-Google",
    "Google-[\\w-]+",
    "Chrome-Lighthouse",
    "Slurp",
    "DuckDuckBot",
    "baiduspider",
    "yandex",
    "sogou",
    "bitlybot",
    "tumblr",
    "vkShare",
    "quora link preview",
    "redditbot",
    "ia_archiver",
    "Bingbot",
    "BingPreview",
    "applebot",
    "facebookexternalhit",
    "facebookcatalog",
    "Twitterbot",
    "LinkedInBot",
    "Slackbot",
    "Discordbot",
    "WhatsApp",
    "SkypeUriPreview",
    "Yeti",
    "googleweblight",
    // Added: Google's main crawler and AI answer engines
    "Googlebot",
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-User",
    "Claude-SearchBot",
    "anthropic-ai",
    "PerplexityBot",
    "Perplexity-User",
    "CCBot",
    "Amazonbot",
    "meta-externalagent",
    "cohere-ai",
    "MistralAI-User",
  ].join("|"),
  "i",
);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  htmlLimitedBots: HTML_LIMITED_BOTS,
  // The Hardhat project (Phase 3) is excluded from the Next.js TypeScript
  // program via tsconfig; contracts tooling carries its own config.

  // Old links (emails already sent, bookmarks, shared URLs) keep working.
  async redirects() {
    // Removed pages: send old links somewhere useful. Temporary, in case they return.
    // Developer profiles (/developers/:handle) still exist; only the listing is gone.
    const removed = [
      { source: "/developers", destination: "/hackathons", permanent: false },
      { source: "/trust", destination: "/how-escrow-works", permanent: false },
    ];
    return removed.concat(
      RENAMED_SECTIONS.flatMap((section) => [
        { source: `${section}/events`, destination: `${section}/hackathons`, permanent: true },
        {
          source: `${section}/events/:path*`,
          destination: `${section}/hackathons/:path*`,
          permanent: true,
        },
      ]),
    );
  },
};

export default nextConfig;

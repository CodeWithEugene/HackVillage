import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

import { RENAMED_IMAGES } from "./lib/seo/renamed-images";

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

/**
 * Media lives on a Cloudflare R2 public URL (lib/ports/storage.ts): either
 * R2_PUBLIC_BASE or the derived pub-<account>.r2.dev host. Only the origin is
 * allow-listed — paths stay unrestricted so bucket layout can change.
 */
function r2PublicOrigin(): string | null {
  const explicit = process.env.R2_PUBLIC_BASE;
  const derived = process.env.R2_ACCOUNT_ID
    ? `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev`
    : null;
  const candidate = explicit ?? derived;
  if (!candidate) return null;
  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

/**
 * Baseline security headers applied to every route. CSP note: script-src
 * keeps 'unsafe-inline' because the App Router streams its RSC payload in
 * inline <script> tags (self.__next_f) and app/layout.tsx ships an inline
 * theme-init script — strict 'self' would blank every page without a nonce
 * pipeline (deliberately not added: no middleware). JSON-LD <script> tags are
 * type="application/ld+json" and execute nowhere, so they are unaffected.
 */
function securityHeaders(): Array<{ key: string; value: string }> {
  const imgSrc = ["'self'", "data:", "blob:", r2PublicOrigin()].filter(Boolean).join(" ");
  return [
    {
      key: "Content-Security-Policy",
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        `style-src 'self' 'unsafe-inline'`,
        `img-src ${imgSrc}`,
        "connect-src 'self' https://api.paystack.co",
        "frame-src https://js.paystack.co https://checkout.paystack.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ];
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  htmlLimitedBots: HTML_LIMITED_BOTS,
  poweredByHeader: false,
  // The Hardhat project (Phase 3) is excluded from the Next.js TypeScript
  // program via tsconfig; contracts tooling carries its own config.

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },

  // Old links (emails already sent, bookmarks, shared URLs) keep working.
  async redirects() {
    // Removed pages: send old links somewhere useful. Temporary, in case they return.
    // Developer profiles (/developers/:handle) still exist; only the listing is gone.
    // (/trust was removed in PR #31 and restored in v1.1 — its redirect is gone
    // with the page back.)
    const removed = [
      { source: "/developers", destination: "/hackathons", permanent: false },
    ];
    // Images renamed for image search: old URLs keep working (and pass their
    // ranking on) wherever they were indexed, shared, or stored.
    const images = Object.entries(RENAMED_IMAGES).map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
    return removed.concat(
      images,
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

export default withSentryConfig(nextConfig, {
  // Source-map upload is a release-time nicety, not a boot requirement:
  // org/project come from env and the plugin stays silent when no
  // SENTRY_AUTH_TOKEN is set (CI, local dev, preview builds all run without).
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: false,
});

import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/url";

/**
 * Private, tokenized, or machine-only surfaces. Search-facing pages stay
 * allowed; auth pages (signin/signup) are deliberately NOT blocked here —
 * they carry a noindex meta tag instead, which crawlers can only read if
 * they are allowed to fetch the page.
 */
const PRIVATE_PATHS = [
  "/dashboard",
  "/organizer",
  "/judge",
  "/admin",
  "/settings",
  "/oauth",
  "/api",
  "/onboarding",
  "/invites",
  "/hackathons/*/workspace",
];

/**
 * AI answer engines are explicitly welcomed: being cited by ChatGPT,
 * Perplexity, Claude and Gemini is a goal for this platform, not a risk.
 * (Cloudflare Content Signals should be set to match — see the SEO runbook.)
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "CCBot",
  "meta-externalagent",
  "cohere-ai",
  "MistralAI-User",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, disallow: PRIVATE_PATHS },
    ],
    sitemap: appUrl("/sitemap.xml"),
    host: appUrl("/"),
  };
}

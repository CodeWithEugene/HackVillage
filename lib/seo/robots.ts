import { appUrl } from "@/lib/url";

/**
 * robots.txt (served by app/robots.txt/route.ts), written by hand rather than with Next's MetadataRoute.Robots so
 * it can carry a Content-Signal line (Cloudflare's content signals policy),
 * which the built-in generator doesn't support.
 *
 * Private, tokenized, or machine-only surfaces are disallowed. Search-facing
 * pages stay allowed; auth pages (signin/signup) are deliberately NOT blocked
 * here: they carry a noindex meta tag instead, which crawlers can only read if
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
 * Content-Signal below states that openly.
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

/**
 * Content signals (https://contentsignals.org): HackVillage allows search
 * indexing, use in AI answers (ai-input), and AI training (ai-train).
 */
const CONTENT_SIGNAL = "search=yes, ai-input=yes, ai-train=yes";

function group(userAgents: readonly string[]): string {
  return [
    ...userAgents.map((agent) => `User-Agent: ${agent}`),
    `Content-Signal: ${CONTENT_SIGNAL}`,
    "Allow: /",
    ...PRIVATE_PATHS.map((path) => `Disallow: ${path}`),
  ].join("\n");
}

export function robotsTxt(): string {
  return (
    [group(["*"]), group(AI_CRAWLERS), `Sitemap: ${appUrl("/sitemap.xml")}`].join("\n\n") + "\n"
  );
}

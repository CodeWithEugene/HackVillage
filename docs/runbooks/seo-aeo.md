# SEO & AEO Runbook

Companion to `docs/audits/2026-09-26-seo-aeo-audit.md`. What ships in code,
what only an owner can do in dashboards, and how to keep it healthy.

## What the codebase serves (do not remove casually)

| Surface                 | File                                                                       | Purpose                                                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/sitemap.xml`          | `app/sitemap.ts`                                                           | Discovery manifest: static pages, blog posts + pagination, public hackathons, developer profiles. Regenerates hourly.                                                                  |
| `/robots.txt`           | `app/robots.ts`                                                            | Crawler policy + `Sitemap:` line. Private surfaces disallowed; AI crawlers explicitly allowed.                                                                                         |
| `/llms.txt`             | `app/llms.txt/route.ts`                                                    | AI-engine discovery file (community convention): citable facts + page map. Regenerates hourly.                                                                                         |
| `/favicon.ico`          | `app/favicon.ico`                                                          | Legacy crawler/browser fallback (the modern icon is `app/icon.png`).                                                                                                                   |
| `/manifest.webmanifest` | `app/manifest.ts`                                                          | PWA metadata.                                                                                                                                                                          |
| JSON-LD                 | `lib/seo/schema.ts` + `components/seo/json-ld.tsx`                         | Organization/WebSite (root layout), Event + Breadcrumb (hackathon pages), Article + Breadcrumb (blog), FAQPage (escrow page), ProfilePage (developer profiles), ItemList (blog index). |
| Canonicals              | per-page `alternates.canonical`                                            | Every indexable page self-canonicalizes; filter/tab variants canonicalize to the base listing.                                                                                         |
| IndexNow                | `scripts/ping-indexnow.ts` + `public/6e497826b467be505d007bfe1b62611d.txt` | Instant Bing-side indexing (Bing powers ChatGPT search, Copilot, DuckDuckGo). Run `pnpm indexnow:ping` after deploys with new pages.                                                   |

**Rules when editing pages:**

- New public page → give it `alternates.canonical`, a keyword-aware title/description, and add it to `app/sitemap.ts`.
- New private/auth surface → `robots: { index: false }` metadata (and add its path prefix to `PRIVATE_PATHS` in `app/robots.ts` only if it must not be crawled at all — noindex pages must stay crawlable).
- Structured data must match visible page content exactly (Google spam policy treats mismatches as manual-action risk).

## Owner dashboard actions (one-time)

1. **Google Search Console** (property already verified):
   - Sitemaps → submit `https://www.hackvillage.xyz/sitemap.xml`.
   - URL Inspection → Request Indexing for `/`, `/hackathons`, `/blog`, `/how-escrow-works`, `/how-it-works`, `/contribute` and each live hackathon page.
   - Watch Coverage: "Discovered – currently not indexed" should drain over 1–3 weeks.
2. **Bing Webmaster Tools** — add the site (import from GSC), verify, submit the sitemap, then run `pnpm indexnow:ping`.
3. **Cloudflare** — the site's robots.txt is now served by the app. Check Cloudflare's robots.txt-management / AI-crawl settings so they _merge_ rather than replace the origin file, and set Content Signals to `search=yes, ai-input=yes` (`ai-train` is a business decision). After any change, re-fetch `https://www.hackvillage.xyz/robots.txt` and confirm the `Sitemap:` line and disallow rules survived.
4. **Vercel** — `hackvillage.vercel.app` currently serves a **stale legacy build** (a separate/old deployment). In the Vercel dashboard: find the project owning that alias, delete it or enable Deployment Protection, so only `www.hackvillage.xyz` serves content. Then 301-redirect or retire it.
5. **Entity building** — create a Wikidata item for HackVillage; keep the Organization `sameAs` list (`lib/seo/site.ts`) in sync with real, live profiles (GitHub, LinkedIn, X, YouTube). Dead `sameAs` links hurt more than missing ones.

## Recurring maintenance

- **After every deploy with new public URLs**: `pnpm indexnow:ping` + GSC sitemap refresh happens automatically (hourly ISR), but request indexing for big launches manually.
- **Monthly**: check GSC Performance (queries, pages) and Coverage; look at which hackathon/blog pages earn impressions and strengthen them.
- **Quarterly**: re-read `/llms.txt` output for staleness; verify `sameAs` links are alive; re-run the AI-answer probe ("best platform to escrow hackathon prizes", "hackathons in Kenya") and record who gets cited.
- **When a hackathon is funded/goes live**: it enters the sitemap automatically (hourly). For launch-day visibility, ping IndexNow and request GSC indexing for the event page.

## Known follow-ups (not in this PR)

- Location landing pages ("Hackathons in Nairobi", "Hackathons in Kenya") once there are enough real events per city to avoid thin content.
- Enrich developer profiles (skills, wins, endorsements are already rendered) and monitor for thin-content warnings in GSC.
- Off-page: Product Hunt / Show HN launch, Kenyan tech media (TechCabal, Techpoint Africa), reciprocal links from Technetium & Salamander, open-source hackathon-tooling lists.

# HackVillage SEO & AEO Audit

**Site:** https://www.hackvillage.xyz
**Date:** 2026-09-26
**Method:** Full codebase review (metadata, routing, structured data), live-site crawl (robots, sitemap, canonicals, redirects, headers, per-page HTML parsing), AI-crawler access tests, crawl-footprint checks (Common Crawl, Wayback), and repo/off-page signal review.
**Scope note:** Audit only — no code was changed.

---

## Executive Summary

**Overall readiness score: 4.5 / 10**

The site has a solid *baseline* — clean SSR Next.js pages, per-page titles/descriptions, correct 404s, good internal nav, HSTS, fast TTFB (~0.4s), AI crawlers not blocked. But the three systems that actually get a site **discovered, indexed, and cited** are missing entirely:

1. **No XML sitemap** (`/sitemap.xml` → 404) — Google has no manifest of your ~25 indexable URLs.
2. **No real robots.txt from the app** — the live file is Cloudflare's content-signals boilerplate with **zero directives and no `Sitemap:` line**.
3. **Zero structured data (JSON-LD)** — no `Organization`, `WebSite`, `Event`, `Article`, `FAQPage`, or `BreadcrumbList` anywhere in the codebase. This kills rich results *and* AI-answer eligibility.

Add to that: **no canonical tags on any page**, **no `og:url`**, **no llms.txt**, **thin content on money pages** (homepage ~334 visible words), and a **near-zero crawl footprint** (Common Crawl: 0 captures; Wayback: 0 snapshots; GitHub repo: 4 stars). The domain is effectively invisible to discovery systems right now — which matches your observation that subpages aren't in Google.

The good news: nothing is *broken* or penalized — the site is simply **unannounced**. Almost every P0 fix is a small file in the Next.js App Router and can ship in one PR.

---

## Section 1 — Crawlability & Indexation

| Check | Status | Evidence |
|---|---|---|
| `robots.txt` served | ⚠️ Broken in practice | Live file = Cloudflare content-signals comments only. **No `User-agent` rules, no `Disallow`, no `Sitemap:` declaration.** Origin app has no `app/robots.ts`. |
| `sitemap.xml` | ❌ Missing | `https://www.hackvillage.xyz/sitemap.xml` → **404**. No `app/sitemap.ts` in repo. |
| Canonical host | ✅ Good | `hackvillage.xyz` → `www.hackvillage.xyz` via **308**; `http` → `https` via **308**. Consistent single host. |
| Canonical tags | ❌ Missing | `rel="canonical"` count = **0** on homepage, listing, event, and blog pages. No `alternates.canonical` anywhere in `app/`. |
| 404 handling | ✅ Good | Unknown URL → real **404** status; unknown event slug → `notFound()` → 404 (no soft-404s). Custom 404 page links home + /hackathons. |
| Robots meta | ⚠️ Partial | Only `/oauth/start` and `/oauth/done` set `noindex`. **App dashboard, admin, auth (signin/signup/onboarding), and settings pages have no `noindex`** — they're auth-gated (redirect to /signin) so they won't index well, but they waste crawl budget and can produce odd SERP entries ("Excluded by noindex" is cleaner than "Crawled – currently not indexed"). |
| Indexable URL inventory | ~25 public URLs | 7 marketing pages + 9 blog posts + 4 event detail pages + developer profiles + 2 unsubscribe variants + pagination variants. |
| Parameter duplicates | ⚠️ Risk | `/hackathons?filter=…&category=…` and `/blog?page=N` render server-side with **no canonical** → duplicate-content variants are crawlable. `/blog?page=2` confirmed live with identical `<title>`. |
| Duplicate pages | ⚠️ Risk | `/unsubscribe` **and** `/newsletter/unsubscribe` both return 200 with identical title "Unsubscribe · HackVillage". |
| HSTS | ✅ Good | `strict-transport-security: max-age=63072000`. |
| Caching/CDN | ✅ Good | Cloudflare + Vercel edge (`x-vercel-cache: HIT`), TTFB ~0.40s, full page ~0.50s. |

### Indexation footprint (why subpages aren't showing in Google)

| Signal | Result |
|---|---|
| Common Crawl (CC-MAIN-2025-51) | **0 captures** for `hackvillage.xyz*` |
| Wayback Machine | **0 snapshots** |
| Sitemap submitted (via robots or file) | ❌ none exists to submit |
| GitHub repo stars / forks | 4 / 10 (weak link-equity signal) |

Interpretation: the site has had almost no external discovery path. Google found it via GSC verification at best; without a sitemap, internal links from anywhere authoritative, or crawl history, subpage discovery is slow and partial. This is the direct cause of "subpages not listed in Google."

*(SERP-position checks for "hackvillage", "hack village", and category terms could not be completed from this environment — Google/Bing/DDG block automated queries and the web_search tool ran out of balance. Please pull GSC → Pages → "Indexed vs Not indexed" for the authoritative list; the fixes below address the known causes regardless.)*

---

## Section 2 — On-Page SEO

### Titles & descriptions (all pages have unique, well-sized tags ✅)

| Page | Title | Assessment |
|---|---|---|
| `/` | "HackVillage: Prize Verified Hackathons" | ⚠️ Brand-first with a coined term ("Prize Verified") nobody searches for. Misses head terms like "hackathon platform", "hackathons in Kenya/Africa". |
| `/hackathons` | "Hackathons · HackVillage" | ⚠️ Too generic — one word vs. Devpost/MLH/HackerEarth. No geo or differentiator ("Escrow-Secured Hackathons", "Hackathons in Kenya & Africa"). |
| `/how-it-works` | "How It Works · HackVillage" | ⚠️ Zero keyword value. |
| `/how-escrow-works` | "How Escrow Works · HackVillage" | ✅ Decent for a niche differentiator term. |
| `/blog` | "Blog · HackVillage" | ⚠️ Generic. |
| Blog posts | e.g. "How Winners Get Paid: Half On The Day, The Rest On Delivery" | ✅ Strong, descriptive, question-matching titles. |
| Event pages | Event title + " · HackVillage" | ✅ Good pattern; add location/date for long-tail ("Clean Energy Hack – Nairobi, Sept 2026"). |

- **H1s:** Homepage H1 = "Great Hackathons. From Start to Finish." — brand voice, but contains no target phrase beyond "Hackathons". Every page has exactly one H1 ✅.
- **Meta descriptions:** present everywhere, correct length, compelling ✅.
- **Headings hierarchy:** clean H1→H2 semantic structure ✅.

### Content depth (visible word counts, live)

| Page | Words | Verdict |
|---|---|---|
| `/` | ~334 | ❌ Thin for a homepage targeting any head term |
| `/hackathons` | ~257 | ❌ Thin (mostly card UI) — needs SEO copy block |
| `/how-it-works` | ~351 | ❌ Thin |
| `/how-escrow-works` | ~1,077 | ✅ Adequate |
| `/contribute` | ~1,282 | ✅ Good |
| Blog posts | full articles, dates + "HackVillage Team" byline rendered | ✅ Good foundation; 9 posts |
| `/developers/wanjiku` | ~166 | ⚠️ Thin profile — indexable; decide policy (see P2) |

### Open Graph / social

- ✅ `og:title/description/image/site_name/type`, twitter card auto-generated, `metadataBase` correctly set in prod (absolute OG image URLs work).
- ❌ **No `og:url`** on any page (Next emits it only when `alternates.canonical` is set — another reason canonicals matter).
- ⚠️ Every page shares one generic `og.png`; event pages and blog posts deserve unique images (blog posts do use their cover ✅, events don't ❌).
- ⚠️ Blog OG image is a `.webp` marketing photo, not a 1200×630 card — some platforms (WhatsApp/X embeds) render it poorly.

### Structured data — ❌ the biggest on-page gap

`grep` across `app/`, `components/`, `lib/`: **0 instances of `application/ld+json` or schema.org**. Missing:

| Schema | Where | Why it matters |
|---|---|---|
| `Organization` + `WebSite` (+ logo, sameAs→GitHub) | sitewide layout | Entity recognition, knowledge panel, sitelinks searchbox; the #1 AEO prerequisite |
| `Event` | `/hackathons/[slug]` | Your event pages contain real dates, Nairobi location, KES prize pools — Google Event rich results + AI answers ("hackathons in Nairobi September 2026") |
| `Article` (+author, datePublished) | blog posts | Data already exists in `lib/blog/types.ts` (date, author, category) but is invisible to machines |
| `BreadcrumbList` | blog/event pages | Breadcrumb rich results |
| `FAQPage` | `/how-escrow-works`, `/how-it-works` | Featured-snippet / AI-answer capture for "how do hackathon prizes work" style queries |
| `ProfilePage`/`Person` | `/developers/[handle]` | If you keep profiles indexed |

---

## Section 3 — AEO Foundations (AI engine readiness)

### Scorecard: **3 / 12 (25%)**

| Layer | Check | Status |
|---|---|---|
| Discovery | robots.txt AI-crawler policy | ⚠️ No explicit policy (Cloudflare file has no directives). Tested: GPTBot, ClaudeBot, PerplexityBot, Googlebot, Bytespider **all get 200** — nothing is blocked ✅, but the posture is accidental, not declared. |
| Discovery | `llms.txt` | ❌ 404 |
| Discovery | `llms-full.txt` | ❌ 404 |
| Discovery | Sitemap | ❌ 404 |
| Parsability | Content in server-rendered HTML (no JS wall) | ✅ Excellent — full SSR/RSC; all key content present with JS disabled |
| Parsability | Token budget | ✅ All pages < 1K–1.3K words — well inside budgets |
| Parsability | Semantic heading hierarchy | ✅ |
| Parsability | FAQ-style Q&A content blocks | ❌ None — no question-format sections on escrow/how-it-works pages |
| Parsability | Article/FAQ/Event schema | ❌ None |
| Capability | Markdown endpoints (`.md` or API) | ❌ None |
| Capability | `agent-permissions.json` / WebMCP | ❌ None (low priority) |
| Off-page | Presence in Common Crawl / training corpora | ❌ Zero captures — AI assistants literally have no copy of this site |

**Key insight:** AI engines (ChatGPT, Perplexity, Gemini, Claude) cite sites they can (a) find, (b) parse, and (c) trust as entities. You pass (b) handsomely — SSR + clean HTML + factual content (prize amounts, dates, payout mechanics are exactly what AI answers want to cite). You fail (a) and (c): no discovery files, no crawl footprint, no entity/schema declaration, no third-party mentions. Until Common Crawl picks the site up (it crawls from known seeds + sitemap/robots signals), you will not appear in AI answers regardless of content quality.

---

## Section 4 — Keyword & Authority Reality Check

Your goal: *"first result for hackathons, hack, hackvillage, hack village, or anything related."* Honest breakdown:

| Query class | Examples | Feasibility | Timeline |
|---|---|---|---|
| **Brand exact** | "hackvillage", "hack village", "hackvillage xyz" | ✅ **Very achievable — should be #1** | 2–6 weeks after sitemap + indexing + a few external mentions |
| **Brand + intent** | "hackvillage hackathons", "hackvillage escrow" | ✅ Achievable | Same |
| **Niche differentiator** | "hackathon escrow platform", "hackathon prize pool escrow", "open source hackathon platform", "hackathons Kenya 2026", "pay hackathon winners instantly" | 🟡 **Realistic path to page 1** — low competition, and you're the only site whose content precisely matches | 2–6 months with content + links |
| **Head terms** | "hackathons", "hack", "hackathon" | ❌ **Not realistic** — owned by Devpost (DR ~90), MLH, HackerEarth, Hack.dev, Wikipedia, LinkedIn with millions of backlinks. A months-old .xyz domain with ~4 GitHub stars cannot out-rank them, and no on-page fix changes that. | Years, and probably never for the bare term |

**Strategy implication:** dominate brand + own the niche ("escrow-verified hackathons", "African hackathon infrastructure", "hackathons Kenya/Nairobi") and let head-term traffic come through those. The "tiny bit related" coverage you want comes from a topic cluster (below), not from the homepage alone.

### Off-page authority (currently the weakest axis)

- 4 GitHub stars, 10 forks; repo description + homepage link are set correctly ✅ (that's one real backlink).
- Footer links out to Technetium, Salamander, codewitheugene.top — **do those link back?** Reciprocal links from the backing orgs are your fastest authority wins.
- No Product Hunt / Hacker News / Devpost-alternative-list presence found. Launches there are the standard play for open-source infra and would seed Common Crawl + AI training corpora.
- No Wikipedia/Wikidata/Crunchbase entity. For AEO, a Wikidata entity for HackVillage is cheap and high-leverage.

---

## Section 5 — Prioritized Fix Roadmap

### P0 — Ship this week (one PR, ~1 day of work, biggest indexing impact)

1. **Add `app/sitemap.ts`** — static routes + all blog posts + public events (query DB with the same `PUBLIC_HACKATHON_WHERE` filter) + developer profiles (if kept indexed). Set `lastmod` for events/posts.
2. **Add `app/robots.ts`** — allow all; **explicitly disallow `/dashboard`, `/organizer`, `/judge`, `/admin`, `/settings`, `/oauth`, `/api`, `/onboarding`**; allow AI crawlers by name (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended); declare `Sitemap: https://www.hackvillage.xyz/sitemap.xml`. ⚠️ Verify Cloudflare's robots.txt-management feature isn't overriding the origin file after deploy — re-fetch `/robots.txt` from production and confirm your directives appear.
3. **Canonicals everywhere** — add `alternates.canonical` to root layout default + each page/dynamic metadata (also fixes missing `og:url`). For `/hackathons?filter=…` and `/blog?page=N`, canonical to the clean base URL (or self-canonical per page for pagination).
4. **`noindex` the private surfaces** — set `robots: { index: false, follow: false }` in metadata for `(app)`, `(auth)`, `admin` layouts (belt-and-braces alongside robots.txt; robots.txt blocking alone prevents Google from *seeing* a noindex).
5. **GSC actions** — submit the sitemap, run URL Inspection → "Request Indexing" on `/`, `/hackathons`, `/blog`, `/how-escrow-works`, and each event page. Check Pages report for "Discovered – currently not indexed".
6. **Kill the duplicate**: 301 `/unsubscribe` → `/newsletter/unsubscribe` (or vice versa) in `next.config.ts`.

### P1 — Weeks 2–3 (rich results + AEO)

7. **JSON-LD everywhere**: `Organization` + `WebSite` in root layout (logo, `sameAs: [GitHub, Technetium]`); `Event` on `/hackathons/[slug]` (dates, location, offers=prize pool); `Article` on blog posts (headline, datePublished, author, image); `BreadcrumbList`; `FAQPage` on escrow page.
8. **`llms.txt`** (+ optional `llms-full.txt`) — one-paragraph description of HackVillage, key pages with summaries, "how prizes are escrowed/paid" facts. Serve via `app/llms.txt/route.ts`.
9. **Rewrite titles/H1s for intent**: homepage → e.g. "HackVillage — Hackathon Platform with Escrowed Prizes & Instant Payouts"; `/hackathons` → "Browse Hackathons in Kenya & Africa — Every Prize Escrow-Verified"; add 150–300-word SEO copy blocks to `/` and `/hackathons` (keep design; put copy below the fold).
10. **FAQ content blocks** answering real queries on `/how-escrow-works` and `/how-it-works`: "Do hackathon winners actually get paid?", "How are hackathon prize pools secured?", "What is a Proof-of-Work developer profile?" — question-format H2/H3 + concise 40–60-word answers = featured-snippet and AI-citation format.
11. **Unique OG images per event** (Next `opengraph-image` + `ImageResponse` — event title, dates, prize pool on brand template).

### P2 — Month 2+ (authority & expansion)

12. **Launches/links**: Product Hunt, Hacker News Show HN, Devpost-alternative listicles, African tech media (TechCabal, Techpoint Africa — pitch "escrow for hackathon prizes"), Technetium/Salamander reciprocal links, awesome-lists (open-source hackathon tooling). Each seeds Common Crawl and AI corpora.
13. **Wikidata entity** + consistent NAP-style brand mentions (same description sentence everywhere).
14. **Topic cluster** for the "anything related" long tail: pillar "Hackathons in Kenya/Africa" + satellites ("how to fund hackathon prizes", "hackathon payout models compared", "how to judge a hackathon fairly" — several blog posts already exist and just need targeting/internal links), all interlinked with the event pages.
15. **Developer-profile policy**: profiles are indexable at ~166 words. Either enrich (skills, endorsements, wins → `ProfilePage` schema, a genuine long-tail asset: "@handle hackathon developer") or `noindex,follow` until they have substance.
16. **Quarterly maintenance**: llms.txt refresh, sitemap auto-covers new events, monitor GSC coverage + AI crawler logs; re-test AI answers ("best platform to escrow hackathon prizes") monthly.

---

## Appendix A — Evidence Log

- `curl` results: `/robots.txt` = 24 comment lines, no directives, no Sitemap line; `/sitemap.xml` = 404; `/llms.txt` = 404; `/manifest.webmanifest` = 200; unknown page = 404; unknown event slug = 404; apex/http → www/https = 308; `/blog?page=2` = 200 (no canonical); `/unsubscribe` & `/newsletter/unsubscribe` = both 200, same title.
- UA probes (all 200): Googlebot, GPTBot, ClaudeBot, PerplexityBot, mobile Safari, Bytespider.
- Homepage HTML: title/desc/OG/Twitter present; canonical=0; `ld+json`=0; `og:url`=0; 1×H1; 20 imgs all with alt ✅; SSR content complete ✅; TTFB 0.40s, total 0.50s, 114 KB HTML.
- Codebase: `app/sitemap.ts`/`app/robots.ts` absent; `grep 'ld+json|schema.org'` across app/components/lib = 0 hits; `alternates|canonical|twitter` in app = 0 hits (twitter tags are auto-derived by Next from OG); robots metadata only in `app/oauth/*`.
- Common Crawl index API: "No Captures found for: hackvillage.xyz". Wayback availability API: no snapshots.
- GitHub API: 4 stars, 10 forks, homepage set to www.hackvillage.xyz, topics [blockchain, hackathons, opensource].
- Word counts (tag-stripped live HTML): / 334, /hackathons 257, /how-it-works 351, /how-escrow-works 1,077, /contribute 1,282, /developers/wanjiku 166.

## Appendix B — Audit limitations

- No Google Search Console API access in this environment — coverage/queries should be cross-checked in GSC (Pages report, Performance report). After P0 ships, GSC becomes the measurement layer.
- Live SERP position checks (Google/Bing/DDG) blocked by bot protection; `web_search` tool had insufficient balance. Brand-query positions should be verified manually in an incognito window.
- Core Web Vitals field data (CrUX) unavailable for a site with this little traffic — lab signals (fast TTFB, edge cache, moderate HTML weight, ~15 scripts) suggest no CWV risk, but confirm in GSC → Core Web Vitals after indexing.

---

## Appendix C — Cross-check of a second, independent audit (2026-09-26)

A second AI-produced audit was compared against this one. Convergence was ~90%. Its unique claims were re-verified against the live site:

**Confirmed and merged into the findings above:**
1. **Non-blog pages inherit the homepage share preview** — `/hackathons/clean-energy-hack` serves `og:title` = "HackVillage: Prize Verified Hackathons". Per-page `openGraph.title/description` needed (blog posts are the only pages that override). → added to P1 item 11.
2. **`/favicon.ico` → 404** (icon is served via `/icon.png` link tag only). Add `app/favicon.ico` or a redirect. → P0.
3. **Metadata streamed into `<body>`** — on `/blog`, `<title>` appears at byte ~38.9K while `</head>` ends at ~2.3K. Google handles this; non-JS AI crawlers may not. Mitigation: keep pages small enough to flush head early / verify after fixes. → P1.
4. **`/hackathons` card images: 4× `alt=""` + `loading="lazy"` on above-the-fold cards** (LCP delay + lost image SEO). First card should be eager with `priority`, and alt text should name the event. → P1.
5. **`/hackathons` listing is uncached** — TTFB 0.58–0.96s with `x-vercel-cache: MISS` on every request (homepage HITs). Add ISR (`revalidate`) to the listing. → P1.

**Refuted — and the reality is worse:**
6. The second audit claimed "the `vercel.app` copy returns 404, so there is no duplicate site." **False**: `https://hackvillage.vercel.app/` returns **200** and serves a **stale legacy build** ("HackVillage — Prize-Verified Event Creation", ~42KB, outdated content/metadata). Duplicate-host risk. Fix: enable Vercel Deployment Protection on non-production deployments, or middleware-redirect `*.vercel.app` → canonical host. → **P0**.

**Adopted from the second audit (not in the original roadmap):**
7. **Bing Webmaster Tools + IndexNow** — Bing powers ChatGPT search, Copilot, and DuckDuckGo; import from GSC and wire IndexNow keys so new pages propagate in minutes. → P0 (user action, alongside GSC submission).
8. **Cloudflare Content Signals** — configure `search=yes, ai-input=yes` (ai-train is a business decision) so the Cloudflare-managed robots.txt explicitly invites AI citation. Must be reconciled with the new `app/robots.ts` — verify which one wins in production after deploy. → P0.
9. **Brand collisions**: "hack village" surfaces VillageHack (KE) and HackersVilla (IN); "hackvillage" SERP is currently led by the GitHub repo, not the website. Mitigate with consistent "HackVillage" naming, Organization schema `sameAs`, and direct links to www.hackvillage.xyz. → P2.
10. **Location pages** ("Hackathons in Nairobi", "Hackathons in Kenya") as cluster satellites. → P2.

**Framing disagreements with the second audit:** Lighthouse SEO=100 is not evidence of health (it doesn't test canonicals, sitemaps, or schema); and performance is secondary to the discovery gap — with 0 Common Crawl captures, the site's first problem is existence, not speed.

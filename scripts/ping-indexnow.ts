/**
 * Ping IndexNow so Bing — the index behind ChatGPT search, Copilot and
 * DuckDuckGo — picks up new or updated pages within minutes instead of
 * waiting for the next recrawl. Google ignores IndexNow (use Search Console
 * "Request Indexing" there); this covers the Bing side of the house.
 *
 *   pnpm indexnow:ping
 *
 * Reads every URL from the live sitemap and submits them in one batch.
 * The key below must match the key file served at public/<key>.txt; if you
 * ever rotate it, update both places (and keyLocation) together.
 */

const KEY = "6e497826b467be505d007bfe1b62611d";
/**
 * Always the live site. It used to read NEXT_PUBLIC_APP_URL, which is
 * localhost in a local .env, so it submitted the local sitemap's localhost
 * URLs. INDEXNOW_SITE overrides it (for example a future domain).
 */
const SITE = (process.env.INDEXNOW_SITE ?? "https://www.hackvillage.xyz").replace(/\/$/, "");
const MAX_URLS_PER_POST = 10_000;

function assertPublicSite(site: string): void {
  const { protocol, hostname } = new URL(site);
  if (protocol !== "https:" || hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error(`IndexNow only accepts public https sites; refusing to submit ${site}.`);
  }
}

async function main(): Promise<void> {
  assertPublicSite(SITE);
  const sitemapResponse = await fetch(`${SITE}/sitemap.xml`);
  if (!sitemapResponse.ok) {
    throw new Error(
      `Sitemap fetch failed: ${sitemapResponse.status} ${sitemapResponse.statusText}`,
    );
  }
  const xml = await sitemapResponse.text();
  const siteHost = new URL(SITE).host;
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1].trim())
    // IndexNow rejects the whole batch if any URL is on another host.
    .filter((url) => new URL(url).host === siteHost);
  if (urls.length === 0) throw new Error(`No ${siteHost} URLs found in the sitemap. Is it deployed?`);

  const payload = {
    host: siteHost,
    key: KEY,
    keyLocation: `${SITE}/${KEY}.txt`,
    urlList: urls.slice(0, MAX_URLS_PER_POST),
  };
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  // 200 = received, 202 = accepted and queued. Anything else is a failure
  // (403 usually means the key file is not reachable at keyLocation yet;
  // 429 is IndexNow's rate limit, so wait an hour or so and try again).
  console.log(
    `Submitted ${payload.urlList.length} ${siteHost} URLs to IndexNow: ${response.status} ${response.statusText}`,
  );
  if (response.status === 429) {
    console.error("IndexNow is rate limiting this host. Try again in an hour or so.");
    process.exitCode = 1;
  } else if (response.status >= 400) {
    console.error(await response.text());
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

// Module marker: without an import/export this file shares the global scope
// with the other scripts/*.ts (and their `main` functions) under tsc.
export {};

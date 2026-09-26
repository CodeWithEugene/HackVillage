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
const SITE = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.hackvillage.xyz").replace(/\/$/, "");
const MAX_URLS_PER_POST = 10_000;

async function main(): Promise<void> {
  const sitemapResponse = await fetch(`${SITE}/sitemap.xml`);
  if (!sitemapResponse.ok) {
    throw new Error(
      `Sitemap fetch failed: ${sitemapResponse.status} ${sitemapResponse.statusText}`,
    );
  }
  const xml = await sitemapResponse.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
  if (urls.length === 0) throw new Error("No URLs found in the sitemap — is it deployed?");

  const payload = {
    host: new URL(SITE).host,
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
  // (403 usually means the key file is not reachable at keyLocation yet).
  console.log(
    `Submitted ${payload.urlList.length} URLs to IndexNow — ${response.status} ${response.statusText}`,
  );
  if (response.status >= 400) {
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

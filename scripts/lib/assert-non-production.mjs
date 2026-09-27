/**
 * Shared guard for the dev/ops scripts in scripts/: refuse to run against a
 * non-localhost DATABASE_URL unless --allow-prod is passed explicitly. These
 * scripts drive real service paths (payouts, newsletter blasts, full event
 * lifecycle transitions) — a mistyped --env-file or a stray production
 * DATABASE_URL in the shell must not turn a "local test" into production
 * damage. Plain .mjs so tsx (and node) load it with zero build setup.
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Exit(1) when DATABASE_URL is set and points at a non-localhost host and
 * --allow-prod was not passed. A missing/unparseable DATABASE_URL is left to
 * fail loudly in the script itself (Prisma reports it better than we can).
 */
export function assertNonProduction({ allowProdFlag = "--allow-prod" } = {}) {
  if (process.argv.slice(2).includes(allowProdFlag)) return;
  const url = process.env.DATABASE_URL;
  if (!url) return;
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    return;
  }
  if (LOCAL_HOSTS.has(host)) return;
  console.error(
    `[guard] Refusing to run: DATABASE_URL points at "${host}", not localhost.\n` +
      `        These scripts mutate real data. If you really mean to touch a remote\n` +
      `        database, re-run with ${allowProdFlag}.`
  );
  process.exit(1);
}

/**
 * Exit(1) when the target URL (load-test base URL) is not localhost and
 * --allow-remote was not passed — hammering a remote deployment with
 * hundreds of concurrent requests is never the default.
 */
export function assertLocalTarget(targetUrl, { allowRemoteFlag = "--allow-remote" } = {}) {
  if (process.argv.slice(2).includes(allowRemoteFlag)) return;
  let host;
  try {
    host = new URL(targetUrl).hostname;
  } catch {
    console.error(`[guard] Refusing to run: target "${targetUrl}" is not a valid URL.`);
    process.exit(1);
  }
  if (LOCAL_HOSTS.has(host)) return;
  console.error(
    `[guard] Refusing to run: target "${targetUrl}" is not localhost.\n` +
      `        Load tests belong against a local dev server. If you really mean to hit\n` +
      `        a remote deployment, re-run with ${allowRemoteFlag}.`
  );
  process.exit(1);
}

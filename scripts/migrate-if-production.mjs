import { execSync } from "node:child_process";

/**
 * Runs on every Vercel build (production and preview share one Neon
 * database). Applying migrations only for the production build avoids an
 * unmerged preview branch silently mutating the shared production schema
 * before its migration has actually been reviewed and merged.
 *
 * This closes the gap that let migration 9_notification_preferences ship in
 * a merged PR without ever reaching production: `next build` alone never
 * runs `prisma migrate deploy`, so the table didn't exist until this was
 * caught in a live audit and applied by hand.
 *
 * Migrations run over a direct (unpooled) connection. `prisma migrate
 * deploy` holds a session-level advisory lock; through Neon's transaction
 * pooler the unlock can land on a different server connection, so the lock
 * leaked onto a pooled connection (later used by pg-boss) and the next deploy
 * timed out with P1002. The direct URL is derived from DATABASE_URL itself
 * (Neon's pooled host is the direct host plus "-pooler"), not from a separate
 * variable: the old DATABASE_URL_UNPOOLED pointed at a different database and
 * was removed.
 */
export function directDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  url.hostname = url.hostname.replace(/-pooler(?=\.)/, "");
  url.searchParams.delete("pgbouncer");
  return url.toString();
}

if (process.env.VERCEL_ENV === "production") {
  const pooled = process.env.DATABASE_URL;
  if (!pooled) throw new Error("DATABASE_URL is required to migrate.");
  execSync("pnpm exec prisma migrate deploy --schema db/schema.prisma", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: directDatabaseUrl(pooled) },
  });
} else {
  console.log(`Skipping prisma migrate deploy (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}).`);
}

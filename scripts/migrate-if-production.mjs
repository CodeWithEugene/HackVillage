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
 */
if (process.env.VERCEL_ENV === "production") {
  execSync("pnpm exec prisma migrate deploy --schema db/schema.prisma", { stdio: "inherit" });
} else {
  console.log(`Skipping prisma migrate deploy (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}).`);
}

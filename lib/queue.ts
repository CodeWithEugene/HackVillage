import PgBoss from "pg-boss";

import { getEnv } from "@/lib/env";

/**
 * pg-boss singleton (ADR-004). Phase 0 wires the connection only — job
 * families (payout.execute, escrow.attest, media.deadline-check, legacy.checkin,
 * notifications.dispatch — plan §12) are registered by the phases that own
 * them. Everything enqueues transactionally against DATABASE_URL, so there is
 * no separate queue infrastructure to run.
 */
let boss: PgBoss | null = null;

export async function getQueue(): Promise<PgBoss> {
  if (!boss) {
    boss = new PgBoss({ connectionString: getEnv().DATABASE_URL });
    boss.on("error", (error) => {
      // Queue errors must be visible but never crash the request path.
      console.error("[pg-boss]", error);
    });
    await boss.start();
  }
  return boss;
}

/** Queue names — one per job family from the build plan §12. */
export const JOB_QUEUES = {
  payout: "payout",
  escrow: "escrow",
  media: "media",
  legacy: "legacy",
  notifications: "notifications",
} as const;

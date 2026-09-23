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
  escrow: "escrow",
  payout: "payout",
  media: "media",
  legacy: "legacy",
  notifications: "notifications",
} as const;

/**
 * Best-effort enqueue with a singleton key (per-entity dedupe). Jobs are
 * never allowed to break a money-path response: failures are logged and the
 * recovery sweep re-drives anything stuck.
 */
export async function enqueue(
  queue: string,
  name: string,
  data: Record<string, unknown>,
  options?: { singletonKey?: string; delaySeconds?: number }
): Promise<void> {
  try {
    const boss = await getQueue();
    await boss.send({
      name,
      data,
      options: {
        singletonKey: options?.singletonKey,
        startAfter: options?.delaySeconds ? options.delaySeconds : undefined,
        retryLimit: 5,
        retryBackoff: true,
        expireInSeconds: 300,
      },
    });
  } catch (error) {
    console.error(`[queue] enqueue failed (name=${name})`, error);
  }
}

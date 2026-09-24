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
let starting: Promise<PgBoss> | null = null;

export async function getQueue(): Promise<PgBoss> {
  if (boss) return boss;
  // Concurrent callers await the same in-flight start instead of racing to
  // create separate PgBoss instances.
  if (starting) return starting;

  starting = (async () => {
    const instance = new PgBoss({ connectionString: getEnv().DATABASE_URL });
    instance.on("error", (error) => {
      // Queue errors must be visible but never crash the request path.
      console.error("[pg-boss]", error);
    });
    await instance.start();
    // Only cache the instance once it's actually started — if start() throws
    // (e.g. a transient connection reset), the next call retries cleanly
    // instead of reusing a never-started, permanently broken instance.
    boss = instance;
    return instance;
  })();

  try {
    return await starting;
  } finally {
    starting = null;
  }
}

/**
 * Job family names (plan §12). pg-boss v10: queue name == job name exactly.
 * Kept as the registry of record for documentation; enqueue() derives queues
 * from these names.
 */
export const JOB_NAMES = {
  attestVaultCreated: "escrow.attest-vault-created",
  attestVaultLocked: "escrow.attest-vault-locked",
  escrowCron: "escrow.cron",
} as const;

/**
 * Best-effort enqueue. pg-boss v10 semantics: a job's name must EXACTLY match
 * an existing queue's name (the insert inner-joins on name equality and
 * silently no-ops otherwise) — so the queue is ensured right here. Jobs are
 * never allowed to break a money-path response: failures are logged and the
 * recovery sweep re-drives anything stuck.
 */
export async function enqueue(
  name: string,
  data: Record<string, unknown>,
  options?: { singletonKey?: string; delaySeconds?: number }
): Promise<void> {
  try {
    const boss = await getQueue();
    // Queue name == job name (pg-boss v10). B03/duplicate on concurrent create.
    await boss.createQueue(name).catch((error: { code?: string }) => {
      if (error?.code !== "B03") throw error;
    });
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

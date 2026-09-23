import { JOB_QUEUES } from "@/lib/queue";
import type { Job } from "pg-boss";

/**
 * Background job handlers (plan §12). Registered once per server process via
 * instrumentation.ts. Handlers must be idempotent — pg-boss delivers
 * at-least-once, and work() receives a BATCH of jobs.
 */

const g = globalThis as unknown as { __hv_jobs_registered?: boolean };

export async function registerJobs(): Promise<void> {
  if (g.__hv_jobs_registered) return;
  g.__hv_jobs_registered = true;

  const [{ getQueue }, escrowDeposits, attestations] = await Promise.all([
    import("@/lib/queue"),
    import("@/services/escrow/deposits"),
    import("@/services/escrow/attestations"),
  ]);

  const boss = await getQueue();

  // Queue families (pg-boss v10 API: queue-level subscriptions).
  for (const queueName of Object.values(JOB_QUEUES)) {
    await boss.createQueue(queueName).catch((error: { code?: string }) => {
      // Already created — fine on HMR restarts.
      if (error?.code !== "B03") throw error;
    });
  }

  const attestBatch = async (jobs: Job<{ eventId: string }>[]) => {
    for (const job of jobs) {
      if (job.name === "escrow.attest-vault-created") {
        await attestations.attestVaultCreation(job.data.eventId);
      } else if (job.name === "escrow.attest-vault-locked") {
        await attestations.attestVaultLocked(job.data.eventId);
      }
    }
  };

  await boss.work("escrow", attestBatch);

  // Hourly deposit expiry sweep — INITIATED deposits die after 24h.
  await boss.createQueue("escrow.cron").catch((error: { code?: string }) => {
    if (error?.code !== "B03") throw error;
  });
  await boss
    .schedule("escrow.cron", "0 * * * *", { kind: "expire-deposits" })
    .catch(() => undefined); // schedule already exists — idempotent registration
  await boss.work("escrow.cron", async (jobs: Job<{ kind?: string }>[]) => {
    for (const job of jobs) {
      if (job.data.kind !== "expire-deposits") continue;
      const expired = await escrowDeposits.expireStaleDeposits();
      if (expired > 0) console.log(`[cron] expired ${expired} stale deposit(s)`);
    }
  });

  console.log("[jobs] registered escrow handlers");
}

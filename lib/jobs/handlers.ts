import type { Job } from "pg-boss";

import { getQueue } from "@/lib/queue";

/**
 * Background job handlers (plan §12). pg-boss v10: a queue's name must equal
 * its job names exactly — every job family registers its own queue + worker.
 * Registered once per server process via instrumentation.ts; handlers must
 * stay idempotent (pg-boss delivers at-least-once, work() receives batches).
 */

const g = globalThis as unknown as { __hv_jobs_registered?: boolean };

async function registerJob(
  boss: Awaited<ReturnType<typeof getQueue>>,
  name: string,
  handler: (data: Record<string, unknown>) => Promise<void>
): Promise<void> {
  // Queue name == job name (pg-boss v10); create is idempotent (B03 = exists).
  await boss.createQueue(name).catch((error: { code?: string }) => {
    if (error?.code !== "B03") throw error;
  });
  await boss.work(name, async (jobs: Job<Record<string, unknown>>[]) => {
    for (const job of jobs) {
      try {
        await handler(job.data ?? {});
      } catch (error) {
        console.error(`[jobs] ${name} failed`, error);
        throw error; // let pg-boss apply retry policy
      }
    }
  });
}

export async function registerJobs(): Promise<void> {
  if (g.__hv_jobs_registered) return;
  g.__hv_jobs_registered = true;

  const [{ getQueue: loadQueue }, attestations, deposits, payouts, payoutAttestations] =
    await Promise.all([
      import("@/lib/queue"),
      import("@/services/escrow/attestations"),
      import("@/services/escrow/deposits"),
      import("@/services/payout/service"),
      import("@/services/payout/attestations"),
    ]);
  const boss = await loadQueue();

  await registerJob(boss, "escrow.attest-vault-created", async (data) =>
    attestations.attestVaultCreation(String(data.eventId))
  );
  await registerJob(boss, "escrow.attest-vault-locked", async (data) =>
    attestations.attestVaultLocked(String(data.eventId))
  );

  // Payout families (Phase 5): execution, attestations, and the sweep.
  await registerJob(boss, "payout.execute", async (data) => {
    await payouts.executePayout(String(data.payoutId));
  });
  await registerJob(boss, "payout.attest", async (data) => {
    await payoutAttestations.attestPayout({
      eventId: String(data.eventId),
      winnerId: String(data.winnerId),
      tranche: data.tranche === "MILESTONE" ? "MILESTONE" : "INSTANT",
      amountKes: Number(data.amountKes),
      txRef: String(data.txRef),
    });
  });

  // Hourly cron: deposit expiry + payout recovery sweep.
  await boss.createQueue("escrow.cron").catch((error: { code?: string }) => {
    if (error?.code !== "B03") throw error;
  });
  await boss
    .schedule("escrow.cron", "0 * * * *", { kind: "expire-deposits" })
    .catch(() => undefined); // schedule already exists — idempotent registration
  await boss.work("escrow.cron", async (jobs: Job<{ kind?: string }>[]) => {
    for (const job of jobs) {
      if (job.data?.kind !== "expire-deposits") continue;
      const expired = await deposits.expireStaleDeposits();
      if (expired > 0) console.log(`[cron] expired ${expired} stale deposit(s)`);
    }
  });

  await boss.createQueue("payout.cron").catch((error: { code?: string }) => {
    if (error?.code !== "B03") throw error;
  });
  await boss
    .schedule("payout.cron", "*/10 * * * *", { kind: "sweep-payouts" })
    .catch(() => undefined);
  await boss.work("payout.cron", async (jobs: Job<{ kind?: string }>[]) => {
    for (const job of jobs) {
      if (job.data?.kind !== "sweep-payouts") continue;
      const driven = await payouts.sweepStuckPayouts();
      if (driven > 0) console.log(`[cron] payout sweep re-drove ${driven} payout(s)`);
    }
  });

  console.log("[jobs] registered escrow + payout handlers");
}

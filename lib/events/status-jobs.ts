import { prisma } from "@/lib/db";

/**
 * Event status lifecycle jobs (audit remediation — the LIVE → IN_PROGRESS
 * leg was missing, so started hackathons rendered "Live" forever). Wired
 * into the hourly escrow.cron handler in lib/jobs/handlers.ts.
 */

/** LIVE events whose start time has passed become IN_PROGRESS (bulk). */
export async function advanceStartedEvents(now: Date = new Date()): Promise<number> {
  const advanced = await prisma.event.updateMany({
    where: { status: "LIVE", startsAt: { lte: now } },
    data: { status: "IN_PROGRESS" },
  });
  return advanced.count;
}

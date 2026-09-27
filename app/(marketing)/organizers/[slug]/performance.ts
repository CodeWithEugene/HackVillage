import type { PayoutStatus, PayoutTranche } from "@prisma/client";

/**
 * Pure math for the /organizers/[slug] payout-performance section, colocated
 * with the route so it stays unit-testable (Next.js page modules may only
 * export route entrypoints). Every metric degrades to an explicit empty
 * state rather than a misleading zero — an organizer with no payouts yet has
 * a clean record, not a failed one.
 */

export interface PayoutRecord {
  tranche: PayoutTranche;
  status: PayoutStatus;
  paidAt: Date | null;
  /** The parent winner's announcedAt — the start of the payout clock. */
  announcedAt: Date;
}

export interface PayoutPerformance {
  /** All instant-tranche payouts ever attempted for the organizer's events. */
  instantTotal: number;
  instantSucceeded: number;
  /** Median minutes from winners announced to instant payout confirmed. */
  medianInstantMinutes: number | null;
}

/** Median of a numeric sample; null when empty (never a fake zero). */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function summarizePayoutPerformance(records: PayoutRecord[]): PayoutPerformance {
  const instant = records.filter((record) => record.tranche === "INSTANT");
  const succeeded = instant.filter((record) => record.status === "SUCCEEDED");
  // Negative durations mean bad clock data upstream; exclude them rather
  // than silently dragging the median down.
  const paid = succeeded.filter(
    (record): record is PayoutRecord & { paidAt: Date } => record.paidAt !== null,
  );
  const minutes = paid
    .map((record) => (record.paidAt.getTime() - record.announcedAt.getTime()) / 60_000)
    .filter((value) => value >= 0);
  return {
    instantTotal: instant.length,
    instantSucceeded: succeeded.length,
    medianInstantMinutes: median(minutes),
  };
}

export interface MediaRecord {
  eventId: string;
  uploadedAt: Date;
  /** The event's mediaDeadlineAt (endsAt + 48h); null means no deadline was set. */
  mediaDeadlineAt: Date | null;
}

export interface MediaTimeliness {
  /** Events with a media deadline and at least one visible upload. */
  eventsWithMedia: number;
  /** Of those, events whose first upload beat the 48-hour deadline. */
  onTime: number;
}

export function summarizeMediaTimeliness(records: MediaRecord[]): MediaTimeliness {
  const firstUploadByEvent = new Map<string, { uploadedAt: Date; mediaDeadlineAt: Date | null }>();
  for (const record of records) {
    const current = firstUploadByEvent.get(record.eventId);
    if (!current || record.uploadedAt.getTime() < current.uploadedAt.getTime()) {
      firstUploadByEvent.set(record.eventId, {
        uploadedAt: record.uploadedAt,
        mediaDeadlineAt: record.mediaDeadlineAt,
      });
    }
  }
  let eventsWithMedia = 0;
  let onTime = 0;
  for (const first of firstUploadByEvent.values()) {
    if (!first.mediaDeadlineAt) continue;
    eventsWithMedia += 1;
    if (first.uploadedAt.getTime() <= first.mediaDeadlineAt.getTime()) onTime += 1;
  }
  return { eventsWithMedia, onTime };
}

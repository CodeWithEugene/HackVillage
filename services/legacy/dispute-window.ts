/**
 * When a winner may dispute an unconfirmed milestone: 14 days after winners
 * were announced (plan §10.5). The winnings page shows the dispute button
 * from then on and the server refuses earlier requests, so both read this
 * one rule.
 */
export const MILESTONE_DISPUTE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function disputeOpensAt(announcedAt: Date): Date {
  return new Date(announcedAt.getTime() + MILESTONE_DISPUTE_WINDOW_MS);
}

export function canOpenDispute(announcedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= disputeOpensAt(announcedAt).getTime();
}

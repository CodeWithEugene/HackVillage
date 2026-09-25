/**
 * Event lifecycle state machine (plan §10.1) — pure functions, no DB.
 * Phase 2 owns the DRAFT → PENDING_DEPOSIT transition; LIVE+ transitions
 * belong to the escrow service (Phase 3) and judging (Phase 4+).
 */

export type EventStatus =
  | "DRAFT"
  | "PENDING_DEPOSIT"
  | "LIVE"
  | "IN_PROGRESS"
  | "JUDGING"
  | "WINNERS_ANNOUNCED"
  | "SETTLED"
  | "CANCELLED"
  | "DISPUTED";

export type VenueType = "PHYSICAL" | "ONLINE" | "HYBRID";

/** Statuses visible on the public browse (anything published, incl. cancelled). */
export const PUBLIC_STATUSES: EventStatus[] = [
  "PENDING_DEPOSIT",
  "LIVE",
  "IN_PROGRESS",
  "JUDGING",
  "WINNERS_ANNOUNCED",
  "SETTLED",
  "CANCELLED",
];

/** Registration is open before the deadline, while the event is announced. */
export function registrationOpen(
  event: { status: EventStatus; registrationDeadline: Date | string; publishedAt?: Date | string | null },
  now: Date = new Date()
): boolean {
  if (!event.publishedAt) return false;
  if (event.status === "CANCELLED" || event.status === "DISPUTED") return false;
  return new Date(event.registrationDeadline).getTime() > now.getTime();
}

/** Submissions are accepted while the event is running. */
export function submissionWindowOpen(
  event: { status: EventStatus; endsAt: Date | string },
  now: Date = new Date()
): boolean {
  const ends = new Date(event.endsAt).getTime();
  return (
    (event.status === "LIVE" || event.status === "IN_PROGRESS") &&
    ends > now.getTime()
  );
}

export interface WizardCompletenessInput {
  title: string;
  venueType: VenueType;
  startsAt: Date | string;
  endsAt: Date | string;
  registrationDeadline: Date | string;
  problemStatement: string | null | undefined;
  prizeCount: number;
  poolKes: number;
}

/**
 * Can this draft be published? Same checks the wizard enforces client-side —
 * the server re-verifies everything (the client proves nothing).
 */
export function canPublishDraft(
  event: WizardCompletenessInput,
  minPoolKes: number
): { ok: boolean; reason?: string } {
  const starts = new Date(event.startsAt).getTime();
  const ends = new Date(event.endsAt).getTime();
  const deadline = new Date(event.registrationDeadline).getTime();

  if (!event.title.trim()) return { ok: false, reason: "The hackathon needs a title." };
  if (!event.problemStatement?.trim()) {
    return { ok: false, reason: "Write the problem statement before publishing." };
  }
  if (event.prizeCount < 1) {
    return { ok: false, reason: "Add at least one prize place." };
  }
  if (event.poolKes < minPoolKes) {
    return { ok: false, reason: `The prize pool must be at least KES ${minPoolKes.toLocaleString("en-KE")}.` };
  }
  if (!(deadline < starts)) {
    return { ok: false, reason: "Registration must close before the hackathon starts." };
  }
  if (!(starts < ends)) {
    return { ok: false, reason: "The hackathon must end after it starts." };
  }
  return { ok: true };
}

/** Public timeline phases shown on event cards and the detail page. */
export const EVENT_PHASES = [
  { key: "vault", label: "Prize Vault" },
  { key: "live", label: "Hackathon live" },
  { key: "judging", label: "Judging" },
  { key: "winners", label: "Winners paid 50%" },
  { key: "settled", label: "Milestones settled" },
] as const;

export type EventPhase = (typeof EVENT_PHASES)[number]["key"];

export function currentPhase(status: EventStatus): EventPhase {
  switch (status) {
    case "DRAFT":
    case "PENDING_DEPOSIT":
    case "CANCELLED":
    case "DISPUTED":
      return "vault";
    case "LIVE":
    case "IN_PROGRESS":
      return "live";
    case "JUDGING":
      return "judging";
    case "WINNERS_ANNOUNCED":
      return "winners";
    default:
      return "settled";
  }
}

export function isPrizeVerified(status: EventStatus, prizeVerifiedAt?: Date | null): boolean {
  return Boolean(prizeVerifiedAt) && status !== "CANCELLED";
}

/** Badge tone per status — used identically across cards, detail, and admin. */
export function statusTone(status: EventStatus): "brand" | "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "PENDING_DEPOSIT":
      return "warning";
    case "LIVE":
    case "IN_PROGRESS":
      return "brand";
    case "JUDGING":
    case "WINNERS_ANNOUNCED":
    case "SETTLED":
      return "success";
    case "CANCELLED":
    case "DISPUTED":
      return "danger";
    default:
      return "neutral";
  }
}

export const STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "Draft",
  PENDING_DEPOSIT: "Pending deposit",
  LIVE: "Live",
  IN_PROGRESS: "In progress",
  JUDGING: "Judging",
  WINNERS_ANNOUNCED: "Winners announced",
  SETTLED: "Settled",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
};

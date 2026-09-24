/**
 * Non essential email categories a user can turn off (NotificationPreference).
 * Security and money critical mail (verification, password resets, payouts,
 * KYB, disputes) has no category here, so it always sends and never shows an
 * unsubscribe link.
 */
export const NOTIFICATION_CATEGORIES = [
  "eventUpdates",
  "teamActivity",
  "judging",
  "reminders",
  "hiring",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  eventUpdates: "Event updates",
  teamActivity: "Team activity",
  judging: "Judging notifications",
  reminders: "Reminders and check ins",
  hiring: "Hiring and introductions",
};

export function isNotificationCategory(value: string): value is NotificationCategory {
  return (NOTIFICATION_CATEGORIES as readonly string[]).includes(value);
}

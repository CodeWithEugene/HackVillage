"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormSuccess } from "@/components/ui/input";
import {
  updateNotificationPreferencesAction,
  type PreferencesActionState,
} from "@/lib/notifications/preferences-actions";
import { CATEGORY_LABELS, NOTIFICATION_CATEGORIES, type NotificationCategory } from "@/lib/notifications/types";

const CATEGORY_HINTS: Record<NotificationCategory, string> = {
  eventUpdates: "Publishing, funding, and prize verified milestones for your events.",
  teamActivity: "Team invites, join and leave notices, and submission confirmations.",
  judging: "Judge invites, judging opened, results, and payout confirmations.",
  reminders: "Portfolio check ins and milestone confirmation nudges.",
  hiring: "Endorsements and introduction requests from hiring partners.",
};

export function NotificationPreferences({
  current,
}: {
  current: Record<NotificationCategory, boolean>;
}) {
  const [state, action, pending] = useActionState<PreferencesActionState, FormData>(
    updateNotificationPreferencesAction,
    {}
  );

  return (
    <Card>
      <CardTitle>Email Preferences</CardTitle>
      <CardDescription>
        Security and payment emails always send, since those keep your account and money safe.
        Everything below is yours to turn on or off.
      </CardDescription>
      <form action={action} className="mt-4 space-y-3">
        {NOTIFICATION_CATEGORIES.map((category) => (
          <label
            key={category}
            className="flex items-start gap-3 rounded-control border border-ink/10 p-3"
          >
            <input
              type="checkbox"
              name={category}
              defaultChecked={current[category]}
              className="mt-0.5 size-4 accent-brand"
            />
            <span>
              <span className="block text-sm font-semibold text-ink">
                {CATEGORY_LABELS[category]}
              </span>
              <span className="block text-xs text-muted">{CATEGORY_HINTS[category]}</span>
            </span>
          </label>
        ))}
        <FormSuccess message={state.message} />
        <Button type="submit" loading={pending}>
          Save Preferences
        </Button>
      </form>
    </Card>
  );
}

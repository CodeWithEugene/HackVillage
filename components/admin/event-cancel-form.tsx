"use client";

import { Ban } from "lucide-react";

import { ConfirmMoneyAction } from "@/components/patterns/confirm-money-action";
import { Input, Label } from "@/components/ui/input";
import { adminCancelEventAction } from "@/lib/admin/event-actions";

/**
 * Admin cancels an event with a reason (the organizer sees it). Calls Agent
 * C's contract `adminCancelEventAction(eventId, reason)` from
 * lib/admin/event-actions.ts.
 */
export function AdminEventCancelForm({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  return (
    <ConfirmMoneyAction
      amountKes={0}
      title={`Cancel ${eventTitle}?`}
      description="Cancelling is permanent: the hackathon closes and registrations are cancelled. The reason is sent to the organizer."
      confirmLabel="Cancel Event"
      triggerLabel={
        <>
          <Ban aria-hidden className="size-4" /> Cancel
        </>
      }
      triggerVariant="ghost"
      triggerSize="sm"
      onConfirm={async (formData) => {
        const reason = String(formData.get("reason") ?? "").trim();
        if (reason.length < 4) {
          return { error: "Give a reason (at least 4 characters) — the organizer sees it." };
        }
        return adminCancelEventAction(eventId, reason);
      }}
    >
      <div>
        <Label htmlFor={`cancel-reason-${eventId}`}>Reason (sent to the organizer)</Label>
        <Input
          id={`cancel-reason-${eventId}`}
          name="reason"
          required
          minLength={4}
          maxLength={300}
          placeholder="e.g. Prize pool never funded after two reminders"
        />
      </div>
    </ConfirmMoneyAction>
  );
}

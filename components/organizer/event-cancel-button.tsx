"use client";

import { Ban } from "lucide-react";

import { ConfirmMoneyAction } from "@/components/patterns/confirm-money-action";
import { cancelEventAction } from "@/lib/events/actions";

export function EventCancelButton({
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
      description="Cancelling is permanent: the hackathon closes, registrations are cancelled, and it can no longer be published or funded. This cannot be undone."
      confirmLabel="Cancel Event"
      triggerLabel={
        <>
          <Ban aria-hidden className="size-4" /> Cancel Event
        </>
      }
      triggerVariant="ghost"
      triggerSize="sm"
      onConfirm={() => cancelEventAction(eventId)}
    />
  );
}

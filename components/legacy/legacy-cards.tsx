"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError, FormSuccess, Textarea } from "@/components/ui/input";
import { openDisputeAction, recordLegacyOutcomeAction, type LegacyActionState } from "@/services/legacy/actions";

/** The 3-month check-in: one tap updates the portfolio's real trajectory. */
export function LegacyCheckinCard({
  submissionId,
  eventTitle,
  dueLabel,
}: {
  submissionId: string;
  eventTitle: string;
  dueLabel: string;
}) {
  const [state, action, pending] = useActionState<LegacyActionState, FormData>(
    recordLegacyOutcomeAction,
    {}
  );

  return (
    <Card>
      <CardTitle>What Happened To Your {eventTitle} Project?</CardTitle>
      <CardDescription>
        Three months on: did it become a product? {dueLabel} Your answer updates the lifecycle
        badge on your Proof-of-Work portfolio (real-world trajectory is part of the record).
      </CardDescription>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="submissionId" value={submissionId} />
        <div className="grid gap-2 sm:grid-cols-4">
          {[
            { value: "IN_PRODUCTION", label: "In production" },
            { value: "PIVOTED", label: "Pivoted" },
            { value: "STILL_DEMO", label: "Still a demo" },
            { value: "ABANDONED", label: "Abandoned" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center justify-center rounded-control border-2 border-ink/10 bg-surface px-3 py-2.5 text-sm font-semibold text-ink hover:border-ink/30 has-[:checked]:border-brand has-[:checked]:bg-brand/10"
            >
              <input
                type="radio"
                name="outcome"
                value={option.value}
                required
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
        <Textarea name="notes" maxLength={1000} placeholder="Optional: what changed, what you learned, what's next." />
        <FormError message={state.error} />
        <FormSuccess message={state.message} />
        <Button type="submit" loading={pending}>
          Record Outcome
        </Button>
      </form>
    </Card>
  );
}

/** Milestone dispute entry (winner side, after 14 days unconfirmed). */
export function DisputeForm({ winnerId }: { winnerId: string }) {
  const [state, action, pending] = useActionState<LegacyActionState, FormData>(
    openDisputeAction,
    {}
  );

  return (
    <Card className="border-warning/40">
      <CardTitle>Milestone Not Confirmed?</CardTitle>
      <CardDescription>
        If you delivered and the organizer isn&apos;t confirming, open a dispute. Funds stay locked
        until platform staff review both sides, so nothing is ever lost.
      </CardDescription>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="winnerId" value={winnerId} />
        <Textarea
          name="claim"
          required
          minLength={30}
          maxLength={2000}
          placeholder="What did you deliver, when, and what's the organizer saying?"
        />
        <FormError message={state.error} />
        <FormSuccess message={state.message} />
        <Button type="submit" variant="secondary" loading={pending}>
          Open Dispute
        </Button>
      </form>
    </Card>
  );
}

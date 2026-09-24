"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormError, FormSuccess, Input, Label } from "@/components/ui/input";
import { resolveDisputeAction, type LegacyActionState } from "@/services/legacy/actions";

export function DisputeResolutionForm({ disputeId }: { disputeId: string }) {
  const [state, action, pending] = useActionState<LegacyActionState, FormData>(
    resolveDisputeAction,
    {}
  );

  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="disputeId" value={disputeId} />
      <div>
        <Label htmlFor={`note-${disputeId}`}>Resolution note (audit-logged)</Label>
        <Input
          id={`note-${disputeId}`}
          name="note"
          required
          minLength={10}
          maxLength={500}
          placeholder="What did the evidence show?"
        />
      </div>
      <FormError message={state.error} />
      <FormSuccess message={state.message} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="resolution" value="RELEASE" size="sm" loading={pending}>
          Release Milestone — Queue Final 50%
        </Button>
        <Button type="submit" name="resolution" value="REJECT" size="sm" variant="danger" loading={pending}>
          Reject Dispute
        </Button>
      </div>
    </form>
  );
}

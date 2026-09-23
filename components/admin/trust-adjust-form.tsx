"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { FormError, FormSuccess, Input, Label } from "@/components/ui/input";
import { adjustTrustAction, type MediaActionState } from "@/services/media/actions";

export function TrustAdjustForm({
  orgId,
  hasPenalty,
  originalReason,
}: {
  orgId: string;
  hasPenalty: boolean;
  originalReason: string;
}) {
  const [state, action, pending] = useActionState<MediaActionState, FormData>(adjustTrustAction, {});
  const [appealMode, setAppealMode] = useState(false);

  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="appeal" value={appealMode ? "1" : "0"} />
      <input type="hidden" name="originalReason" value={originalReason} />

      {!appealMode ? (
        <div className="grid gap-3 sm:grid-cols-[6rem_1fr_auto] sm:items-end">
          <div>
            <Label htmlFor={`delta-${orgId}`} className="text-xs">
              Delta
            </Label>
            <Input
              id={`delta-${orgId}`}
              name="delta"
              type="number"
              min={-50}
              max={50}
              defaultValue={0}
            />
          </div>
          <div>
            <Label htmlFor={`reason-${orgId}`} className="text-xs">
              Reason (audit-logged)
            </Label>
            <Input id={`reason-${orgId}`} name="reason" required minLength={6} maxLength={300} placeholder="Why this adjustment?" />
          </div>
          <Button type="submit" size="sm" variant="secondary" loading={pending}>
            Apply
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <Label htmlFor={`appeal-note-${orgId}`} className="text-xs">
              Appeal note — grants +10, reversing the media penalty
            </Label>
            <Input id={`appeal-note-${orgId}`} name="reason" required minLength={6} maxLength={300} placeholder="Why should this penalty be reversed?" />
          </div>
          <Button type="submit" size="sm" variant="secondary" loading={pending}>
            Grant appeal
          </Button>
        </div>
      )}

      <div className="flex items-center gap-3">
        {hasPenalty ? (
          <button
            type="button"
            className="text-xs font-semibold text-ink underline"
            onClick={() => setAppealMode((mode) => !mode)}
          >
            {appealMode ? "Switch to manual adjustment" : "Switch to penalty appeal"}
          </button>
        ) : null}
        <FormError message={state.error} />
        <FormSuccess message={state.message} />
      </div>
    </form>
  );
}

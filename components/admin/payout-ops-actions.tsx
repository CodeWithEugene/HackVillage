"use client";

import { useActionState, useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormError, FormSuccess, Input } from "@/components/ui/input";
import {
  adminMarkPaidAction,
  adminRetryPayoutAction,
  type PayoutActionState,
} from "@/services/payout/actions";

export function PayoutOpsActions({ payoutId }: { payoutId: string }) {
  const [retry, startRetry] = useTransition();
  const [retryError, setRetryError] = useState<string | null>(null);
  const [markState, markPaid, marking] = useActionState<PayoutActionState, FormData>(
    adminMarkPaidAction,
    {}
  );

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          loading={retry}
          onClick={() =>
            startRetry(async () => {
              const result = await adminRetryPayoutAction(payoutId);
              setRetryError(result.error ?? null);
            })
          }
        >
          <RotateCcw aria-hidden className="size-4" /> Retry payout
        </Button>
        {retryError ? (
          <span role="alert" className="text-xs font-semibold text-danger">
            {retryError}
          </span>
        ) : null}
      </div>

      <form action={markPaid} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="payoutId" value={payoutId} />
        <div className="min-w-48 flex-1">
          <Input
            name="receipt"
            placeholder="Receipt / transaction reference (required)"
            aria-label={`Receipt for payout ${payoutId}`}
            required
            minLength={6}
            maxLength={200}
          />
        </div>
        <Button type="submit" size="sm" variant="danger" loading={marking}>
          Mark paid with receipt
        </Button>
      </form>
      <FormError message={markState.error} />
      <FormSuccess message={markState.message} />
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";

import { ConfirmMoneyAction } from "@/components/patterns/confirm-money-action";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { adminMarkPaidAction, adminRetryPayoutAction } from "@/services/payout/actions";

export function PayoutOpsActions({
  payoutId,
  amountKes,
}: {
  payoutId: string;
  amountKes: number;
}) {
  const [retry, startRetry] = useTransition();
  const [retryError, setRetryError] = useState<string | null>(null);

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

      <ConfirmMoneyAction
        amountKes={amountKes}
        confirmWord="PAID"
        title="Mark this payout as paid?"
        description="Records the payout as manually paid with the receipt reference and writes an audit entry. Only do this against a real payment receipt."
        confirmLabel="Mark Paid With Receipt"
        triggerLabel="Mark Paid With Receipt"
        triggerVariant="danger"
        triggerSize="sm"
        onConfirm={async (formData) => {
          const receipt = String(formData.get("receipt") ?? "").trim();
          if (receipt.length < 6) {
            return { error: "Paste the payment receipt reference (at least 6 characters)." };
          }
          return adminMarkPaidAction({}, formData);
        }}
      >
        <input type="hidden" name="payoutId" value={payoutId} />
        <div>
          <Label htmlFor={`receipt-${payoutId}`}>Receipt / transaction reference</Label>
          <Input
            id={`receipt-${payoutId}`}
            name="receipt"
            placeholder="e.g. MPesa code or bank reference"
            required
            minLength={6}
            maxLength={200}
          />
        </div>
      </ConfirmMoneyAction>
    </div>
  );
}

"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/input";
import { initiateDepositAction, type EscrowActionState } from "@/services/escrow/actions";

export function FundVaultForm({
  eventId,
  grossDueKes,
  disabled,
}: {
  eventId: string;
  grossDueKes: string;
  disabled?: string;
}) {
  const [state, action, pending] = useActionState<EscrowActionState, FormData>(
    initiateDepositAction,
    {}
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      {disabled ? (
        <p className="rounded-control border border-warning/40 bg-warning/10 p-3 text-sm font-semibold text-ink">
          {disabled}
        </p>
      ) : (
        <p className="text-sm text-muted">
          You&apos;ll be charged <strong className="text-ink">{grossDueKes}</strong>: the pool plus
          the 5% platform fee (ADR-012). Winners always receive 100% of the declared prizes.
        </p>
      )}
      {state.error === "KYB_REQUIRED" ? (
        <FormError message="Your organization needs to be verified first. Open Verification from your organizer page." />
      ) : (
        <FormError message={state.error} />
      )}
      <Button type="submit" loading={pending} disabled={Boolean(disabled)}>
        Fund The Prize Vault
      </Button>
    </form>
  );
}

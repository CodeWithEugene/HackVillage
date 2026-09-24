"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormError, FormSuccess, Label, Textarea } from "@/components/ui/input";
import {
  initiateDepositAction,
  requestKybAction,
  type EscrowActionState,
} from "@/services/escrow/actions";

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
          You&apos;ll be charged <strong className="text-ink">{grossDueKes}</strong> — the pool plus
          the 5% platform fee (ADR-012). Winners always receive 100% of the declared prizes.
        </p>
      )}
      {state.error === "KYB_REQUIRED" ? (
        <FormError message="Your organization needs verified KYB first — request it below." />
      ) : (
        <FormError message={state.error} />
      )}
      <Button type="submit" loading={pending} disabled={Boolean(disabled)}>
        Fund the Prize Vault
      </Button>
    </form>
  );
}

export function KybRequestForm({ orgId }: { orgId: string }) {
  const [state, action, pending] = useActionState<EscrowActionState, FormData>(
    requestKybAction,
    {}
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="orgId" value={orgId} />
      <p className="text-sm text-muted">
        Business verification (KYB) is required before your first deposit — a Central Bank of
        Kenya compliance step handled through our licensed payment partner. Platform staff review
        requests within 48 hours.
      </p>
      <Label htmlFor={`kyb-note-${orgId}`}>Anything that helps the review (optional)</Label>
      <Textarea id={`kyb-note-${orgId}`} name="note" maxLength={2000} placeholder="Registration number, website, socials…" />
      <FormError message={state.error} />
      <FormSuccess message={state.message} />
      <Button type="submit" variant="secondary" loading={pending}>
        Request KYB review
      </Button>
    </form>
  );
}

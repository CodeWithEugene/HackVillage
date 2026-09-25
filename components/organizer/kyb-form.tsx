"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormError, FormSuccess, Input, Label, Textarea } from "@/components/ui/input";
import { submitKybAction, type KybFormState } from "@/lib/orgs/verification-actions";

interface KybFormProps {
  orgId: string;
  registrationLabel: string;
  kraPinRequired: boolean;
  /** The last submission, so a rejected organization only fixes what's wrong. */
  previous?: {
    legalName: string;
    registrationNumber: string;
    kraPin: string | null;
    signatoryName: string;
    signatoryRole: string;
    notes: string | null;
  } | null;
}

export function KybForm({ orgId, registrationLabel, kraPinRequired, previous }: KybFormProps) {
  const [state, action, pending] = useActionState<KybFormState, FormData>(submitKybAction, {});

  if (state.submitted) {
    return (
      <FormSuccess message="Thanks. Your details are in review, and we'll email you as soon as there's a decision." />
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="orgId" value={orgId} />

      <div className="space-y-1.5">
        <Label htmlFor="kyb-legal-name">Registered Legal Name</Label>
        <Input
          id="kyb-legal-name"
          name="legalName"
          required
          minLength={2}
          maxLength={120}
          defaultValue={previous?.legalName}
        />
        <p className="text-xs text-muted">Exactly as it appears on your registration documents.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="kyb-registration">{registrationLabel}</Label>
          <Input
            id="kyb-registration"
            name="registrationNumber"
            required
            minLength={3}
            maxLength={60}
            defaultValue={previous?.registrationNumber}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kyb-kra-pin">KRA PIN{kraPinRequired ? "" : " (optional)"}</Label>
          <Input
            id="kyb-kra-pin"
            name="kraPin"
            required={kraPinRequired}
            maxLength={14}
            autoCapitalize="characters"
            defaultValue={previous?.kraPin ?? ""}
            placeholder="P051234567Z"
            className="font-mono uppercase"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="kyb-signatory">Authorized Signatory</Label>
          <Input
            id="kyb-signatory"
            name="signatoryName"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            defaultValue={previous?.signatoryName}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kyb-signatory-role">Their Role</Label>
          <Input
            id="kyb-signatory-role"
            name="signatoryRole"
            required
            minLength={2}
            maxLength={60}
            defaultValue={previous?.signatoryRole}
            placeholder="Director, Dean, Chairperson…"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="kyb-notes">Anything Else For The Reviewer (optional)</Label>
        <Textarea
          id="kyb-notes"
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={previous?.notes ?? ""}
        />
      </div>

      <FormError message={state.error} />
      <Button type="submit" loading={pending}>
        Submit For Review
      </Button>
    </form>
  );
}

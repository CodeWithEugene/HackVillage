"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError, FormSuccess, Input, Label } from "@/components/ui/input";
import { becomeHiringPartnerAction, type PowActionState } from "@/services/pow/actions";

export function JoinHiringForm() {
  const [state, action, pending] = useActionState<PowActionState, FormData>(
    becomeHiringPartnerAction,
    {}
  );

  return (
    <Card className="mx-auto max-w-xl">
      <CardTitle>Become A Hiring Partner</CardTitle>
      <CardDescription>
        Free for partners and developers. You get verified winners with receipts (win records,
        real payouts, and judge endorsements) and one-click introductions.
      </CardDescription>
      <form action={action} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="companyName">Your company</Label>
          <Input id="companyName" name="companyName" required maxLength={80} placeholder="Acme Fintech Ltd" />
        </div>
        <FormError message={state.error} />
        <FormSuccess message={state.message} />
        <Button type="submit" loading={pending}>
          Join As Hiring Partner
        </Button>
      </form>
    </Card>
  );
}

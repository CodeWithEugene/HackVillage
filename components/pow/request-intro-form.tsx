"use client";

import { useActionState } from "react";
import { Handshake } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError, FormSuccess, Textarea } from "@/components/ui/input";
import { requestIntroductionAction, type PowActionState } from "@/services/pow/actions";

/** One-click intro request (hiring partners → verified winners). */
export function RequestIntroForm({
  developerId,
  eventId,
  handle,
}: {
  developerId: string;
  eventId: string;
  handle: string;
}) {
  const [state, action, pending] = useActionState<PowActionState, FormData>(
    requestIntroductionAction,
    {}
  );

  return (
    <Card>
      <CardTitle className="flex items-center gap-2">
        <Handshake aria-hidden className="size-5" /> Request An Introduction To @{handle}
      </CardTitle>
      <CardDescription>
        One click sends your message, and if they accept, contact details are exchanged both ways.
        Anchored to their verified win.
      </CardDescription>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="developerId" value={developerId} />
        <input type="hidden" name="eventId" value={eventId} />
        <Textarea
          name="message"
          required
          minLength={20}
          maxLength={1000}
          placeholder="What you're offering: the role, the team, why their winning work fits."
        />
        <FormError message={state.error} />
        <FormSuccess message={state.message} />
        <Button type="submit" loading={pending}>
          Send Intro Request
        </Button>
      </form>
    </Card>
  );
}

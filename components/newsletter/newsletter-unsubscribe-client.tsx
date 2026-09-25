"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  newsletterUnsubscribeAction,
  type NewsletterUnsubscribeState,
} from "@/lib/newsletter/actions";

export function NewsletterUnsubscribeClient({ token }: { token: string }) {
  const [state, action, pending] = useActionState<NewsletterUnsubscribeState, FormData>(
    newsletterUnsubscribeAction,
    {}
  );

  if (state.done) {
    return (
      <Card className="text-center">
        <h1 className="font-display text-2xl font-bold text-ink">You Are Unsubscribed</h1>
        <p className="mt-2 text-sm text-muted">
          You will not get the HackVillage newsletter anymore. You can subscribe again anytime
          from the homepage.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="secondary" arrow>Back To HackVillage</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="text-center">
      <h1 className="font-display text-2xl font-bold text-ink">Unsubscribe</h1>
      <p className="mt-2 text-sm text-muted">
        Confirm to stop getting the HackVillage newsletter. This only affects the newsletter, not
        your account or event emails.
      </p>
      <form action={action} className="mt-6">
        <input type="hidden" name="token" value={token} />
        <Button type="submit" loading={pending} className="w-full">
          Confirm Unsubscribe
        </Button>
      </form>
      {state.error ? <p className="mt-3 text-sm text-danger">{state.error}</p> : null}
    </Card>
  );
}

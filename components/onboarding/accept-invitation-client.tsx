"use client";

import { useTransition } from "react";
import { Link } from "lucide-react";
import LinkNext from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { acceptInvitationTokenAction } from "@/lib/onboarding/actions";

export function AcceptInvitationClient({
  orgName,
  email,
  token,
  invalid,
}: {
  orgName?: string;
  email?: string;
  token?: string;
  invalid?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (invalid) {
    return (
      <Card className="text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Invite Unavailable</h1>
        <p className="mt-2 text-sm text-muted">
          {orgName
            ? `${orgName}'s invite link is expired or already used. Ask for a fresh one.`
            : "This invite doesn't exist. Double-check the link, or ask the organizer to resend it."}
        </p>
        <LinkNext href="/dashboard" className="mt-6 inline-block">
          <Button variant="secondary">Go To Dashboard</Button>
        </LinkNext>
      </Card>
    );
  }

  return (
    <Card className="text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-brand">
        <Link aria-hidden className="size-7 text-ink" />
      </span>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink">
        You&apos;re joining {orgName}
      </h1>
      <p className="mt-2 text-sm text-muted">
        Accepting adds the organizer role to your account ({email}) and gives you access to the
        organization&apos;s events.
      </p>
      <Button
        className="mt-6 w-full"
        loading={pending}
        onClick={() => startTransition(() => void acceptInvitationTokenAction(token ?? ""))}
      >
        Accept Invitation
      </Button>
      <p className="mt-4 text-xs text-muted">
        Not you?{" "}
        <LinkNext href="/settings" className="underline">
          Manage your account
        </LinkNext>
        .
      </p>
    </Card>
  );
}

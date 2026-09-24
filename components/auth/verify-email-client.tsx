"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, Input, Label } from "@/components/ui/input";
import { resendVerificationAction, verifyEmailAction, type AuthActionState } from "@/lib/auth/actions";

export function VerifyEmailClient({ token }: { token: string }) {
  const [verifyState, verify, verifying] = useActionState<AuthActionState, string>(
    async (_prev, raw) => verifyEmailAction(raw),
    {}
  );
  const [resendState, resend, resending] = useActionState<AuthActionState, FormData>(
    resendVerificationAction,
    {}
  );

  useEffect(() => {
    if (token) void verify(token);
  }, [token, verify]);

  if (!token) {
    return (
      <Card className="text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Verify Your Email</h1>
        <p className="mt-2 text-sm text-muted">
          This page needs the link from your verification email. Open the newest email from
          HackVillage and click the button inside.
        </p>
      </Card>
    );
  }

  if (verifying && !verifyState.error && !verifyState.message) {
    return (
      <Card className="text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Verifying…</h1>
        <p className="mt-2 text-sm text-muted">One moment while we confirm your link.</p>
      </Card>
    );
  }

  if (verifyState.message === "verified") {
    return (
      <Card className="text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-success/15">
          <span aria-hidden className="text-3xl">✓</span>
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">Email Verified</h1>
        <p className="mt-2 text-sm text-muted">Your account is ready. Sign in to continue.</p>
        <Link href="/signin" className="mt-6 inline-block">
          <Button>Go To Sign In</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="font-display text-2xl font-bold text-ink">Couldn&apos;t Verify</h1>
      <p className="mt-2 text-sm text-danger">{verifyState.error}</p>
      <form action={resend} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="resend-email">Your email</Label>
          <Input
            id="resend-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="the one you signed up with"
            required
          />
        </div>
        <Button type="submit" variant="secondary" className="w-full" loading={resending}>
          Send A Fresh Verification Email
        </Button>
      </form>
      {resendState.message === "sent" ? (
        <p role="status" className="mt-3 text-sm font-medium text-success">
          If an account needs verification, a new link is on its way.
        </p>
      ) : null}
      <FormError message={resendState.error} />
      <p className="mt-4 text-xs text-muted">
        Links expire after 24 hours. Still stuck?{" "}
        <Link href="/signin" className="underline">
          Sign in
        </Link>{" "}
        to try again.
      </p>
    </Card>
  );
}

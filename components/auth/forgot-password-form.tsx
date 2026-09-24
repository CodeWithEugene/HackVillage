"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, FormSuccess, Input, Label } from "@/components/ui/input";
import { requestPasswordResetAction, type AuthActionState } from "@/lib/auth/actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(
    requestPasswordResetAction,
    {}
  );

  if (state.message === "sent") {
    return (
      <Card className="text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Check your inbox</h1>
        <p className="mt-2 text-sm text-muted">
          If an account exists for that email, a reset link is on its way. The link expires in one
          hour.
        </p>
        <Link href="/signin" className="mt-6 inline-block">
          <Button variant="secondary">Back to sign in</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="font-display text-2xl font-bold text-ink">Reset your password</h1>
      <p className="mt-1 text-sm text-muted">
        Enter your email and we&apos;ll send a reset link.
      </p>

      <form action={action} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <FormError message={state.error} />
        <FormSuccess message={state.message === "sent" ? undefined : state.message} />
        <Button type="submit" className="w-full" loading={pending}>
          Send reset link
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/signin" className="font-semibold text-ink hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}

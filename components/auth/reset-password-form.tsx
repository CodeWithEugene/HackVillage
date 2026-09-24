"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, Input, Label } from "@/components/ui/input";
import { resetPasswordAction, type AuthActionState } from "@/lib/auth/actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(resetPasswordAction, {});

  if (!token) {
    return (
      <Card className="text-center">
        <h1 className="font-display text-2xl font-bold text-ink">Reset link needed</h1>
        <p className="mt-2 text-sm text-muted">
          Open this page from the link in your reset email, or request a new one.
        </p>
        <Link href="/forgot-password" className="mt-6 inline-block">
          <Button variant="secondary">Request a reset link</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="font-display text-2xl font-bold text-ink">Choose a new password</h1>
      <p className="mt-1 text-sm text-muted">This link expires one hour after it was sent.</p>

      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />
        <div>
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
          />
          <p className="mt-1.5 text-xs text-muted">At least 10 characters, with a letter and a number.</p>
        </div>
        <FormError message={state.error} />
        <Button type="submit" className="w-full" loading={pending}>
          Update password
        </Button>
      </form>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Github } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, FormSuccess, Input, Label } from "@/components/ui/input";
import { signInAction, type AuthActionState } from "@/lib/auth/actions";

export function SignInForm({
  googleEnabled,
  githubEnabled,
  notice,
}: {
  googleEnabled: boolean;
  githubEnabled: boolean;
  notice?: string;
}) {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(signInAction, {});
  const unverified = state.error === "EMAIL_NOT_VERIFIED";

  return (
    <Card>
      <h1 className="font-display text-2xl font-bold text-ink">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Sign in to your HackVillage account.</p>

      {notice ? <FormSuccess message={notice} /> : null}

      {(googleEnabled || githubEnabled) && (
        <>
          <div className="mt-6 grid gap-2">
            {googleEnabled && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => signIn("google", { redirectTo: "/dashboard" })}
              >
                Continue with Google
              </Button>
            )}
            {githubEnabled && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => signIn("github", { redirectTo: "/dashboard" })}
              >
                <Github aria-hidden className="size-4" /> Continue with GitHub
              </Button>
            )}
          </div>
          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-ink/10" /> or with email <span className="h-px flex-1 bg-ink/10" />
          </div>
        </>
      )}

      <form action={action} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        {unverified ? (
          <div className="rounded-control border border-warning/30 bg-warning/10 p-3 text-sm text-ink">
            Your email isn&apos;t verified yet. Check your inbox — or{" "}
            <Link
              href="/forgot-password"
              className="font-semibold underline"
            >
              resend the verification email
            </Link>
            .
          </div>
        ) : (
          <FormError message={state.error} />
        )}

        <Button type="submit" className="w-full" loading={pending}>
          Sign in
        </Button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-muted hover:text-ink">
          Forgot password?
        </Link>
        <Link href="/signup" className="font-semibold text-ink hover:underline">
          Create account
        </Link>
      </div>
    </Card>
  );
}

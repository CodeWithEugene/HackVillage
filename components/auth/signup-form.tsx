"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Building2, Code2 } from "lucide-react";

import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, Input, Label } from "@/components/ui/input";
import { signUpAction, type AuthActionState } from "@/lib/auth/actions";
import type { SignUpRole } from "@/lib/auth/signup-links";

const ROLES = [
  {
    value: "DEVELOPER",
    icon: Code2,
    title: "Developer",
    description: "Join verified hackathons, build with a team, win and get paid instantly.",
  },
  {
    value: "ORGANIZER",
    icon: Building2,
    title: "Organizer",
    description: "Run Prize Verified hackathons with escrowed prize pools.",
  },
] as const;

export function SignUpForm({
  initialRole = "DEVELOPER",
  googleEnabled,
  githubEnabled,
}: {
  initialRole?: SignUpRole;
  googleEnabled: boolean;
  githubEnabled: boolean;
}) {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(signUpAction, {});
  const [role, setRole] = useState<SignUpRole>(initialRole);

  return (
    <Card>
      <h1 className="font-display text-2xl font-bold text-ink">Create Your Account</h1>
      <p className="mt-1 text-sm text-muted">
        {role === "ORGANIZER"
          ? "Start with your own account. Next, you'll set up your organization."
          : "One account, many roles: you can add organizer or judge access later."}
      </p>

      <OAuthButtons
        googleEnabled={googleEnabled}
        githubEnabled={githubEnabled}
        // OAuth accounts start as developers; organizer setup grants the organizer role.
        redirectTo={role === "ORGANIZER" ? "/onboarding/organizer" : "/dashboard"}
      />

      <form action={action} className="mt-6 space-y-5">
        <input type="hidden" name="role" value={role} />

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">I&apos;m joining as</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLES.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={role === option.value}
                onClick={() => setRole(option.value)}
                className={`rounded-card border-2 p-4 text-left transition-colors ${
                  role === option.value
                    ? "border-brand bg-brand/10"
                    : "border-ink/10 bg-surface hover:border-ink/25"
                }`}
              >
                <option.icon aria-hidden className="size-5 text-ink" />
                <p className="mt-2 font-semibold text-ink">{option.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{option.description}</p>
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" autoComplete="name" required minLength={2} />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>

        {/* Organizers appear under their organization, so they skip the builder handle;
            the server still suggests one from the email. */}
        {role === "DEVELOPER" ? (
          <div>
            <Label htmlFor="handle">Handle (optional)</Label>
            <Input
              id="handle"
              name="handle"
              placeholder="your public profile address"
              maxLength={30}
            />
            <p className="mt-1.5 text-xs text-muted">
              hackvillage.xyz/developers/<span className="font-mono">your-handle</span>. Leave blank
              and we&apos;ll suggest one from your email.
            </p>
          </div>
        ) : null}

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
          />
          <p className="mt-1.5 text-xs text-muted">
            At least 10 characters, with a letter and a number.
          </p>
        </div>

        <FormError message={state.error} />

        <Button type="submit" className="w-full" loading={pending}>
          Create Account
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/signin" className="font-semibold text-ink hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Building2, Code2, Github } from "lucide-react";
import { signIn } from "next-auth/react";

import { GoogleIcon } from "@/components/icons/google-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, Input, Label } from "@/components/ui/input";
import { signUpAction, type AuthActionState } from "@/lib/auth/actions";

const ROLES = [
  {
    value: "DEVELOPER",
    icon: Code2,
    title: "Developer",
    description: "Join verified events, build with a team, win and get paid instantly.",
  },
  {
    value: "ORGANIZER",
    icon: Building2,
    title: "Organizer",
    description: "Run Prize Verified events with escrowed prize pools.",
  },
] as const;

export function SignUpForm({
  googleEnabled,
  githubEnabled,
}: {
  googleEnabled: boolean;
  githubEnabled: boolean;
}) {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(signUpAction, {});
  const [role, setRole] = useState<"DEVELOPER" | "ORGANIZER">("DEVELOPER");
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);

  return (
    <Card>
      <h1 className="font-display text-2xl font-bold text-ink">Create Your Account</h1>
      <p className="mt-1 text-sm text-muted">
        One account, many roles — you can add organizer or judge access later.
      </p>

      {(googleEnabled || githubEnabled) && (
        <>
          <p className="mt-6 text-sm font-semibold text-ink">Continue with:</p>
          <div className={`mt-2 grid gap-2 ${googleEnabled && githubEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
            {googleEnabled && (
              <Button
                type="button"
                variant="secondary"
                loading={oauthLoading === "google"}
                disabled={oauthLoading !== null}
                onClick={() => {
                  setOauthLoading("google");
                  void signIn("google", { redirectTo: "/dashboard" });
                }}
              >
                {oauthLoading !== "google" && <GoogleIcon className="size-4" />} Google
              </Button>
            )}
            {githubEnabled && (
              <Button
                type="button"
                variant="secondary"
                loading={oauthLoading === "github"}
                disabled={oauthLoading !== null}
                onClick={() => {
                  setOauthLoading("github");
                  void signIn("github", { redirectTo: "/dashboard" });
                }}
              >
                {oauthLoading !== "github" && <Github aria-hidden className="size-4" />} GitHub
              </Button>
            )}
          </div>
          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-ink/10" /> or with email <span className="h-px flex-1 bg-ink/10" />
          </div>
        </>
      )}

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
                    : "border-ink/10 bg-white hover:border-ink/25"
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

        <div>
          <Label htmlFor="handle">Handle (optional)</Label>
          <Input id="handle" name="handle" placeholder="your public profile address" maxLength={30} />
          <p className="mt-1.5 text-xs text-muted">
            hackvillage.app/developers/<span className="font-mono">your-handle</span> — leave blank and
            we&apos;ll suggest one from your email.
          </p>
        </div>

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
          <p className="mt-1.5 text-xs text-muted">At least 10 characters, with a letter and a number.</p>
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

"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, Input, Label, Textarea } from "@/components/ui/input";
import {
  createOrganizationAction,
  joinOrganizationAction,
  type OnboardingActionState,
} from "@/lib/onboarding/actions";

export function OrganizerOnboardingForm({
  name,
  existingOrgName,
}: {
  name: string;
  existingOrgName?: string;
}) {
  const [mode, setMode] = useState<"create" | "join">(existingOrgName ? "join" : "create");
  const [createState, createOrg, creating] = useActionState<OnboardingActionState, FormData>(
    createOrganizationAction,
    {}
  );
  const [joinState, joinOrg, joining] = useActionState<OnboardingActionState, FormData>(
    joinOrganizationAction,
    {}
  );

  return (
    <div className="mx-auto w-full max-w-xl">
      <Card>
        <h1 className="font-display text-2xl font-bold text-ink">
          {existingOrgName ? `Welcome, ${name.split(" ")[0]}` : "Set up your organization"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Organizations run events and hold escrowed prize pools. Your KYB (business verification)
          is collected later, only when you fund your first event.
        </p>

        {existingOrgName ? (
          <div className="mt-4 rounded-control border border-success/30 bg-success/10 p-3 text-sm text-ink">
            You already belong to <strong>{existingOrgName}</strong>, and you&apos;re set. If you were
            invited to another organization, switch to the invite tab below.
          </div>
        ) : null}

        <div className="mt-6 flex gap-2" role="tablist" aria-label="Organization setup mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "create"}
            onClick={() => setMode("create")}
            className={`rounded-control px-4 py-2 text-sm font-semibold ${
              mode === "create" ? "bg-brand text-ink" : "bg-ink/5 text-ink-soft hover:bg-ink/10"
            }`}
          >
            Create an organization
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "join"}
            onClick={() => setMode("join")}
            className={`rounded-control px-4 py-2 text-sm font-semibold ${
              mode === "join" ? "bg-brand text-ink" : "bg-ink/5 text-ink-soft hover:bg-ink/10"
            }`}
          >
            Join with an invite code
          </button>
        </div>

        {mode === "create" ? (
          <form action={createOrg} className="mt-6 space-y-5">
            <div>
              <Label htmlFor="name">Organization name</Label>
              <Input
                id="name"
                name="name"
                required
                minLength={2}
                maxLength={80}
                placeholder="Technetium Kenya"
              />
              <p className="mt-1.5 text-xs text-muted">
                This is the public name participants see on your events and trust page.
              </p>
            </div>
            <div>
              <Label htmlFor="about">About (optional)</Label>
              <Textarea
                id="about"
                name="about"
                maxLength={2000}
                placeholder="What your organization does and why it runs hackathons."
              />
            </div>
            <FormError message={createState.error} />
            <Button type="submit" className="w-full" loading={creating}>
              Create Organization
            </Button>
          </form>
        ) : (
          <form action={joinOrg} className="mt-6 space-y-5">
            <div>
              <Label htmlFor="code">Invite code</Label>
              <Input
                id="code"
                name="code"
                required
                minLength={6}
                maxLength={10}
                placeholder="the code your organizer shared"
                className="font-mono"
              />
              <p className="mt-1.5 text-xs text-muted">
                Invite codes look like <span className="font-mono">hkm3npw7</span> and expire after
                7 days.
              </p>
            </div>
            <FormError message={joinState.error} />
            <Button type="submit" className="w-full" loading={joining}>
              Join Organization
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

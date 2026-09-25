"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, Input, Label, Textarea } from "@/components/ui/input";
import {
  completeDeveloperOnboardingAction,
  type OnboardingActionState,
} from "@/lib/onboarding/actions";

interface ProfileDefaults {
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  skills?: string[];
  githubLogin?: string | null;
  linkedinUrl?: string | null;
}

export function DeveloperProfileForm({
  name,
  defaults,
  editing = false,
}: {
  name: string;
  defaults?: ProfileDefaults;
  editing?: boolean;
}) {
  const [state, action, pending] = useActionState<OnboardingActionState, FormData>(
    completeDeveloperOnboardingAction,
    {}
  );

  return (
    <div className="mx-auto w-full max-w-xl">
      <Card>
        <h1 className="font-display text-2xl font-bold text-ink">
          {editing ? "Edit your profile" : `Welcome, ${name.split(" ")[0]}`}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Your Proof-of-Work profile is what judges and hiring partners see. Everything here is
          verified by platform activity, with no self-reported stats.
        </p>

        <form action={action} className="mt-6 space-y-5">
          <div>
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              name="headline"
              required
              maxLength={120}
              defaultValue={defaults?.headline ?? ""}
              placeholder="Full-stack developer: React, Node, Postgres"
            />
          </div>

          <div>
            <Label htmlFor="location">Location (optional)</Label>
            <Input
              id="location"
              name="location"
              maxLength={80}
              defaultValue={defaults?.location ?? ""}
              placeholder="Nairobi, Kenya"
            />
          </div>

          <div>
            <Label htmlFor="skills">Skills (optional)</Label>
            <Input
              id="skills"
              name="skills"
              maxLength={200}
              defaultValue={(defaults?.skills ?? []).join(", ")}
              placeholder="react, typescript, node, postgres"
            />
            <p className="mt-1.5 text-xs text-muted">Comma-separated, up to 12 skills.</p>
          </div>

          <div>
            <Label htmlFor="githubLogin">GitHub username (optional)</Label>
            <Input
              id="githubLogin"
              name="githubLogin"
              maxLength={60}
              defaultValue={defaults?.githubLogin ?? ""}
              placeholder="your-github-username"
            />
          </div>

          <div>
            <Label htmlFor="linkedinUrl">LinkedIn URL (optional)</Label>
            <Input
              id="linkedinUrl"
              name="linkedinUrl"
              type="url"
              maxLength={300}
              defaultValue={defaults?.linkedinUrl ?? ""}
              placeholder="https://linkedin.com/in/you"
            />
          </div>

          <div>
            <Label htmlFor="bio">Bio (optional)</Label>
            <Textarea
              id="bio"
              name="bio"
              maxLength={2000}
              defaultValue={defaults?.bio ?? ""}
              placeholder="What you build, what you care about, what you're looking for."
            />
          </div>

          <FormError message={state.error} />

          <Button type="submit" className="w-full" loading={pending}>
            {editing ? "Save Changes" : "Finish Setup"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

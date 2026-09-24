"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, FormSuccess, Input, Label, Textarea } from "@/components/ui/input";
import { updateDeveloperProfileAction, type OnboardingActionState } from "@/lib/onboarding/actions";

interface Defaults {
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  skills?: string[];
  githubLogin?: string | null;
  linkedinUrl?: string | null;
  visible?: boolean;
}

export function EditProfileForm({ handle, defaults }: { handle: string; defaults: Defaults }) {
  const [state, action, pending] = useActionState<OnboardingActionState, FormData>(
    updateDeveloperProfileAction,
    {}
  );
  const [visible, setVisible] = useState(defaults.visible ?? true);

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">Your profile</h1>
        <p className="mt-1 text-sm text-muted">
          Everything on your public profile is platform-verified — wins, contributions,
          endorsements. This form only sets your presentation.
        </p>
      </header>

      <Card>
        <form action={action} className="space-y-5">
          <div>
            <Label htmlFor="handle">Handle</Label>
            <Input id="handle" name="handle" required defaultValue={handle} maxLength={30} className="font-mono" />
            <p className="mt-1.5 text-xs text-muted">
              Your public profile lives at <span className="font-mono">/developers/{handle}</span>.
            </p>
          </div>

          <div>
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              name="headline"
              required
              maxLength={120}
              defaultValue={defaults.headline ?? ""}
            />
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              maxLength={80}
              defaultValue={defaults.location ?? ""}
            />
          </div>

          <div>
            <Label htmlFor="skills">Skills</Label>
            <Input
              id="skills"
              name="skills"
              maxLength={200}
              defaultValue={(defaults.skills ?? []).join(", ")}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="githubLogin">GitHub username</Label>
              <Input
                id="githubLogin"
                name="githubLogin"
                maxLength={60}
                defaultValue={defaults.githubLogin ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input
                id="linkedinUrl"
                name="linkedinUrl"
                type="url"
                maxLength={300}
                defaultValue={defaults.linkedinUrl ?? ""}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" name="bio" maxLength={2000} defaultValue={defaults.bio ?? ""} />
          </div>

          <label className="flex items-center gap-3 rounded-control border border-ink/10 p-3 text-sm text-ink">
            <input
              type="checkbox"
              name="visible"
              checked={visible}
              onChange={(event) => setVisible(event.target.checked)}
              className="size-4 accent-[#222]"
            />
            <span>
              <strong>Public profile.</strong> Uncheck to hide yourself from developer browse —
              direct links still work.
            </span>
          </label>

          <FormError message={state.error} />
          <FormSuccess message={state.message} />

          <Button type="submit" loading={pending}>
            Save Profile
          </Button>
        </form>
      </Card>
    </div>
  );
}

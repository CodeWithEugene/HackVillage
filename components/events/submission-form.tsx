"use client";

import { useActionState, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError, FormSuccess, Input, Label, Textarea } from "@/components/ui/input";
import { saveSubmissionAction, type SubmissionActionState } from "@/lib/events/submission-actions";

interface Member {
  userId: string;
  name: string | null;
  handle: string;
}

export function SubmissionForm({
  teamId,
  members,
  defaults,
  windowOpen,
}: {
  teamId: string;
  members: Member[];
  defaults?: {
    repoUrl: string;
    demoUrl?: string | null;
    description: string;
    split?: { userId: string; percent: number }[] | null;
  } | null;
  windowOpen: boolean;
}) {
  const [state, action, pending] = useActionState<SubmissionActionState, FormData>(
    saveSubmissionAction,
    {}
  );
  const [split, setSplit] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const existing = defaults?.split;
    for (const member of members) {
      const found = existing?.find((entry) => entry.userId === member.userId);
      initial[member.userId] = found ? String(found.percent) : "";
    }
    return initial;
  });

  const splitTotal = useMemo(
    () => Object.values(split).reduce((sum, percent) => sum + (Number(percent) || 0), 0),
    [split]
  );

  return (
    <Card>
      <CardTitle>Submission</CardTitle>
      <CardDescription>
        One submission per team — any member can save it, everyone sees it. {windowOpen
          ? "Editable until the event ends."
          : "The submission window has closed — this is your final entry."}
      </CardDescription>

      <form action={action} className="mt-4 space-y-5">
        <input type="hidden" name="teamId" value={teamId} />
        <input
          type="hidden"
          name="split"
          value={JSON.stringify(
            members.map((member) => ({ userId: member.userId, percent: Number(split[member.userId]) || 0 }))
          )}
        />

        <div>
          <Label htmlFor="repoUrl">Repository URL</Label>
          <Input
            id="repoUrl"
            name="repoUrl"
            type="url"
            required
            defaultValue={defaults?.repoUrl ?? ""}
            placeholder="https://github.com/your-org/your-project"
          />
        </div>

        <div>
          <Label htmlFor="demoUrl">Demo URL (optional)</Label>
          <Input
            id="demoUrl"
            name="demoUrl"
            type="url"
            defaultValue={defaults?.demoUrl ?? ""}
            placeholder="https://your-demo.vercel.app"
          />
        </div>

        <div>
          <Label htmlFor="description">What did you build?</Label>
          <Textarea
            id="description"
            name="description"
            required
            minLength={40}
            maxLength={6000}
            defaultValue={defaults?.description ?? ""}
            placeholder="The problem you solved, how it works, and what you'd do next."
          />
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-ink">
            Prize split declaration{" "}
            <Badge variant={splitTotal === 100 ? "success" : "warning"}>
              total {splitTotal}%
            </Badge>
          </legend>
          <p className="mt-1 text-xs leading-5 text-muted">
            Who receives what if this team wins. The platform pays the leader the full prize —
            this declared split is visible to every member and guides the payout (ADR-013).
          </p>
          <div className="mt-3 space-y-2">
            {members.map((member) => (
              <div key={member.userId} className="flex items-center gap-3">
                <span className="flex-1 text-sm font-semibold text-ink">
                  {member.name ?? `@${member.handle}`}
                  <span className="ml-1 font-normal text-muted">@{member.handle}</span>
                </span>
                <div className="flex w-28 items-center gap-1">
                  <Input
                    aria-label={`Split percent for ${member.handle}`}
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={split[member.userId] ?? ""}
                    onChange={(event) =>
                      setSplit((current) => ({ ...current, [member.userId]: event.target.value }))
                    }
                  />
                  <span className="text-sm text-muted">%</span>
                </div>
              </div>
            ))}
          </div>
          {members.length > 1 && splitTotal !== 100 ? (
            <p className="mt-2 text-xs font-semibold text-warning">
              Split percentages must add up to exactly 100.
            </p>
          ) : null}
        </fieldset>

        <FormError message={state.error} />
        <FormSuccess message={state.message} />

        {windowOpen ? (
          <Button type="submit" loading={pending}>
            {defaults ? "Update Submission" : "Submit Project"}
          </Button>
        ) : (
          <p className="text-sm font-semibold text-muted">Window closed — submission locked.</p>
        )}
      </form>
    </Card>
  );
}

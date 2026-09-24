"use client";

import { useActionState, useTransition } from "react";
import { UserPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError, FormSuccess, Input, Label } from "@/components/ui/input";
import {
  inviteJudgeAction,
  revokeJudgeAssignmentAction,
  type JudgingActionState,
} from "@/services/judging/actions";

interface JudgeRow {
  assignmentId: string;
  name: string;
  handle: string;
  status: "INVITED" | "ACTIVE" | "DECLINED";
  finalizedCount: number;
  teamsTotal: number;
}

export function JudgesManager({
  eventId,
  judges,
}: {
  eventId: string;
  judges: JudgeRow[];
}) {
  const [state, action, pending] = useActionState<JudgingActionState, FormData>(
    inviteJudgeAction,
    {}
  );
  const [busy, startTransition] = useTransition();

  return (
    <Card>
      <CardTitle className="flex items-center gap-2">
        <UserPlus aria-hidden className="size-5" /> Judges
      </CardTitle>
      <CardDescription>
        Judges must be HackVillage users and can&apos;t participate in the event they judge. Every
        judge finalizes per team — and the feedback gate (one strength, one improvement, one next
        step) applies to every team before scores count.
      </CardDescription>

      <form action={action} className="mt-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="eventId" value={eventId} />
        <div className="min-w-56 flex-1">
          <Label htmlFor="judge-handle">Invite by handle</Label>
          <Input id="judge-handle" name="handle" required placeholder="@their-handle" maxLength={30} />
        </div>
        <Button type="submit" loading={pending}>
          Invite judge
        </Button>
      </form>
      <FormError message={state.error} />
      <FormSuccess message={state.message} />

      {judges.length > 0 ? (
        <ul className="mt-5 divide-y divide-ink/5">
          {judges.map((judge) => (
            <li key={judge.assignmentId} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {judge.name} <span className="font-normal text-muted">@{judge.handle}</span>
                </p>
                {judge.status === "ACTIVE" ? (
                  <p className="text-xs text-muted">
                    {judge.finalizedCount}/{judge.teamsTotal} teams finalized
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-bold uppercase tracking-wide ${
                    judge.status === "ACTIVE"
                      ? "text-success"
                      : judge.status === "INVITED"
                        ? "text-warning"
                        : "text-muted"
                  }`}
                >
                  {judge.status.toLowerCase()}
                </span>
                {judge.status !== "DECLINED" ? (
                  <button
                    type="button"
                    aria-label={`Remove judge ${judge.handle}`}
                    className="rounded-control p-1.5 text-danger hover:bg-danger/10"
                    disabled={busy}
                    onClick={() =>
                      startTransition(() => void revokeJudgeAssignmentAction(judge.assignmentId))
                    }
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">No judges invited yet.</p>
      )}
    </Card>
  );
}

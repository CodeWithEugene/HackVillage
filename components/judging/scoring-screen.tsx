"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError, FormSuccess, Input, Label } from "@/components/ui/input";
import { FEEDBACK_KINDS, type Criterion, type FeedbackKind } from "@/lib/judging/compute";
import {
  deleteFeedbackAction,
  finalizeTeamAction,
  saveFeedbackAction,
  saveScoresAction,
  type JudgingActionState,
} from "@/services/judging/actions";

interface FeedbackItem {
  id: string;
  kind: FeedbackKind;
  point: string;
}

export function ScoringScreen({
  teamId,
  teamName,
  criteria,
  existingScores,
  feedback,
  finalized,
  judgingOpen,
}: {
  teamId: string;
  teamName: string;
  criteria: Criterion[];
  existingScores: Record<string, number>;
  feedback: FeedbackItem[];
  finalized: boolean;
  judgingOpen: boolean;
}) {
  const [scoresState, saveScores, saving] = useActionState<JudgingActionState, FormData>(
    saveScoresAction,
    {}
  );
  const [feedbackState, addFeedback, adding] = useActionState<JudgingActionState, FormData>(
    saveFeedbackAction,
    {}
  );
  const [finalizeState, setFinalizeState] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byKind = (kind: FeedbackKind) => feedback.filter((f) => f.kind === kind);
  const locked = finalized || !judgingOpen;

  return (
    <div className="space-y-6">
      <form action={saveScores} className="space-y-6">
        <input type="hidden" name="teamId" value={teamId} />
        <Card>
          <CardTitle>Rubric Scoring — {teamName}</CardTitle>
          <CardDescription>
            Whole numbers 0–10 per criterion. Save as often as you like; finalization locks
            everything.
          </CardDescription>

          <div className="mt-4 space-y-5">
            {criteria.map((criterion) => (
              <div key={criterion.id}>
                <Label htmlFor={`score-${criterion.id}`} className="flex items-center justify-between">
                  <span>{criterion.label}</span>
                  <span className="font-mono text-xs text-muted">weight {criterion.weight}</span>
                </Label>
                <div className="flex items-center gap-3">
                  <input
                    id={`score-${criterion.id}`}
                    name={`score-${criterion.id}`}
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    defaultValue={existingScores[criterion.id] ?? 5}
                    disabled={locked}
                    className="h-2 flex-1 accent-[#222]"
                  />
                  <output
                    htmlFor={`score-${criterion.id}`}
                    className="w-8 text-right font-mono text-sm font-bold text-ink"
                  >
                    {existingScores[criterion.id] ?? 5}
                  </output>
                </div>
              </div>
            ))}
          </div>

          <FormError message={scoresState.error} />
          <FormSuccess message={scoresState.message} />
          {!locked ? (
            <Button type="submit" className="mt-5" loading={saving}>
              Save Scores
            </Button>
          ) : null}
        </Card>
      </form>

      <Card>
        <CardTitle>Structured Feedback</CardTitle>
        <CardDescription>
          The gate: one <strong>strength</strong>, one <strong>improvement</strong>, and one{" "}
          <strong>next step</strong> per team before scores can finalize — this is what developers
          take home.
        </CardDescription>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {FEEDBACK_KINDS.map((kind) => (
            <div key={kind} className="rounded-card border border-ink/10 p-3">
              <p className="flex items-center justify-between text-sm font-bold text-ink">
                <span className="capitalize">{kind.toLowerCase()}</span>
                <Badge variant={byKind(kind).length > 0 ? "success" : "warning"}>
                  {byKind(kind).length}
                </Badge>
              </p>
              <ul className="mt-2 space-y-2">
                {byKind(kind).map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                    <span className="leading-6 text-ink-soft">{item.point}</span>
                    {!locked ? (
                      <button
                        type="button"
                        aria-label="Delete feedback point"
                        className="mt-1 shrink-0 text-danger hover:opacity-70"
                        onClick={() => startTransition(() => void deleteFeedbackAction(item.id))}
                      >
                        <Trash2 aria-hidden className="size-3.5" />
                      </button>
                    ) : null}
                  </li>
                ))}
                {byKind(kind).length === 0 ? (
                  <li className="text-xs text-muted">None yet.</li>
                ) : null}
              </ul>
            </div>
          ))}
        </div>

        {!locked ? (
          <form action={addFeedback} className="mt-5 space-y-3">
            <input type="hidden" name="teamId" value={teamId} />
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
              <div>
                <Label htmlFor="kind">Kind</Label>
                <select
                  id="kind"
                  name="kind"
                  className="h-11 w-full rounded-control border border-ink/15 bg-surface px-3 text-ink"
                  required
                >
                  {FEEDBACK_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind.toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="point">Feedback point</Label>
                <Input id="point" name="point" required minLength={10} maxLength={600} placeholder="Specific and actionable — what would you tell this team?" />
              </div>
              <Button type="submit" variant="secondary" loading={adding}>
                Add
              </Button>
            </div>
            <FormError message={feedbackState.error} />
            <FormSuccess message={feedbackState.message} />
          </form>
        ) : null}
      </Card>

      {judgingOpen ? (
        <Card>
          <CardTitle>Finalize Your Review</CardTitle>
          <CardDescription>
            Finalization requires every criterion scored and the full feedback gate. After
            finalizing, your scores and feedback lock.
          </CardDescription>
          {finalizeState ? (
            <p role="alert" className="mt-3 rounded-control border border-danger/40 bg-danger/10 p-3 text-sm font-semibold text-danger">
              {finalizeState}
            </p>
          ) : null}
          {finalized ? (
            <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-success">
              <Check aria-hidden className="size-4" /> Review finalized — thank you.
            </p>
          ) : (
            <Button
              className="mt-4"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await finalizeTeamAction(teamId);
                  if (result.error) setFinalizeState(result.error);
                  else setFinalizeState(null);
                })
              }
            >
              Finalize review
            </Button>
          )}
        </Card>
      ) : null}
    </div>
  );
}

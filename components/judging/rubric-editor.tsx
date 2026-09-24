"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError, FormSuccess, Input, Label } from "@/components/ui/input";
import { DEFAULT_RUBRIC, type Criterion } from "@/lib/judging/compute";
import { saveRubricAction, type JudgingActionState } from "@/services/judging/actions";

interface Row extends Criterion {
  key: string;
}

export function RubricEditor({
  eventId,
  initial,
  locked,
}: {
  eventId: string;
  initial: Criterion[] | null;
  locked: boolean;
}) {
  const [state, action, pending] = useActionState<JudgingActionState, FormData>(
    saveRubricAction,
    {}
  );
  const [rows, setRows] = useState<Row[]>(
    (initial ?? DEFAULT_RUBRIC).map((criterion, index) => ({ ...criterion, key: `c${index}` }))
  );

  const total = rows.reduce((sum, row) => sum + (Number(row.weight) || 0), 0);

  const setRow = (key: string, patch: Partial<Row>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  return (
    <Card>
      <CardTitle>Rubric</CardTitle>
      <CardDescription>
        Tune labels and weights from the platform template — at least 3 criteria, weights totalling
        exactly 100. {locked ? "Locked: judging is open." : "Locks when judging opens."}
      </CardDescription>

      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="eventId" value={eventId} />
        <input
          type="hidden"
          name="criteria"
          value={JSON.stringify(
            rows.map((row) => ({
              id: row.id.trim() || `criterion-${row.key}`,
              label: row.label.trim(),
              weight: Number(row.weight) || 0,
            }))
          )}
        />

        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[1fr_1fr_5rem_auto] items-end gap-2 rounded-control border border-ink/10 p-3"
            >
              <div>
                <Label htmlFor={`label-${row.key}`} className="text-xs">
                  Label
                </Label>
                <Input
                  id={`label-${row.key}`}
                  value={row.label}
                  onChange={(e) => setRow(row.key, { label: e.target.value })}
                  disabled={locked}
                  maxLength={60}
                />
              </div>
              <div>
                <Label htmlFor={`id-${row.key}`} className="text-xs">
                  Key
                </Label>
                <Input
                  id={`id-${row.key}`}
                  value={row.id}
                  onChange={(e) => setRow(row.key, { id: e.target.value })}
                  disabled={locked}
                  className="font-mono text-xs"
                  maxLength={40}
                />
              </div>
              <div>
                <Label htmlFor={`weight-${row.key}`} className="text-xs">
                  Weight
                </Label>
                <Input
                  id={`weight-${row.key}`}
                  type="number"
                  min={1}
                  max={100}
                  value={row.weight}
                  onChange={(e) => setRow(row.key, { weight: Number(e.target.value) })}
                  disabled={locked}
                />
              </div>
              <button
                type="button"
                aria-label={`Remove ${row.label}`}
                className="mb-1 flex size-11 items-center justify-center rounded-control text-danger hover:bg-danger/10"
                disabled={locked || rows.length <= 3}
                onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
              >
                <Trash2 aria-hidden className="size-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant={total === 100 ? "success" : "warning"}>weights total {total}</Badge>
          {!locked ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setRows((current) => [
                  ...current,
                  {
                    key: `c${Date.now().toString(36)}`,
                    id: "",
                    label: "",
                    weight: 0,
                  },
                ])
              }
            >
              <Plus aria-hidden className="size-4" /> Add criterion
            </Button>
          ) : null}
        </div>

        <FormError message={state.error} />
        <FormSuccess message={state.message} />
        {!locked ? (
          <Button type="submit" loading={pending}>
            Save Rubric
          </Button>
        ) : null}
      </form>
    </Card>
  );
}

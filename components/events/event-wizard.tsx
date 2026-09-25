"use client";

import { useActionState, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormError, Input, Label, Textarea } from "@/components/ui/input";
import { formatKes } from "@/lib/utils";
import { saveEventAction, type EventActionState } from "@/lib/events/actions";

export interface WizardDefaults {
  eventId?: string;
  title?: string;
  summary?: string;
  venueType?: "PHYSICAL" | "ONLINE" | "HYBRID";
  location?: string;
  startsAt?: Date;
  endsAt?: Date;
  registrationDeadline?: Date;
  problemStatement?: string;
  rules?: string;
  rolesWanted?: string[];
  maxTeams?: number;
  prizes?: { place: number; label: string; amountKes: number; milestoneRequired: boolean }[];
}

interface PrizeRow {
  place: number;
  label: string;
  amount: string;
  milestoneRequired: boolean;
}

const STEPS = ["Basics", "Problem", "Prizes", "Teams", "Review"] as const;

function toLocalInput(date?: Date): string {
  if (!date) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export function EventWizard({ defaults, minPoolKes }: { defaults?: WizardDefaults; minPoolKes: number }) {
  const [state, action, pending] = useActionState<EventActionState, FormData>(saveEventAction, {});
  const [step, setStep] = useState(0);
  const [venueType, setVenueType] = useState<"PHYSICAL" | "ONLINE" | "HYBRID">(
    defaults?.venueType ?? "PHYSICAL"
  );
  const [prizes, setPrizes] = useState<PrizeRow[]>(
    defaults?.prizes?.length
      ? defaults.prizes.map((p) => ({
          place: p.place,
          label: p.label,
          amount: String(p.amountKes),
          milestoneRequired: p.milestoneRequired,
        }))
      : [
          { place: 1, label: "1st place", amount: "", milestoneRequired: true },
          { place: 2, label: "2nd place", amount: "", milestoneRequired: true },
        ]
  );

  const total = prizes.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const setPrize = (index: number, patch: Partial<PrizeRow>) => {
    setPrizes((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const visible = (index: number) => (step === index ? "block" : "hidden");

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Stepper */}
      <ol className="mb-6 flex items-center gap-1 text-xs font-semibold" aria-label="Wizard progress">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-1">
            <span
              className={`flex size-6 items-center justify-center rounded-full ${
                index <= step ? "bg-brand text-ink" : "bg-ink/8 text-muted"
              }`}
              aria-current={index === step ? "step" : undefined}
            >
              {index + 1}
            </span>
            <span className={index === step ? "text-ink" : "text-muted"}>{label}</span>
            {index < STEPS.length - 1 ? <span aria-hidden className="mx-1 h-px w-3 bg-ink/15" /> : null}
          </li>
        ))}
      </ol>

      <form action={action} className="space-y-6">
        <input type="hidden" name="eventId" value={defaults?.eventId ?? ""} />
        <input type="hidden" name="venueType" value={venueType} />
        <input
          type="hidden"
          name="prizes"
          value={JSON.stringify(
            prizes
              .filter((p) => p.label.trim() && Number(p.amount) > 0)
              .map((p) => ({
                place: p.place,
                label: p.label.trim(),
                amountKes: Number(p.amount),
                milestoneRequired: p.milestoneRequired,
              }))
          )}
        />

        {/* Step 1 — Basics */}
        <div className={visible(0)}>
          <Card className="space-y-5">
            <div>
              <Label htmlFor="title">Hackathon title</Label>
              <Input id="title" name="title" required maxLength={120} defaultValue={defaults?.title ?? ""} placeholder="Fintech for Matatu Culture" />
            </div>
            <div>
              <Label htmlFor="summary">One-line summary</Label>
              <Input id="summary" name="summary" maxLength={300} defaultValue={defaults?.summary ?? ""} placeholder="Build the rails Nairobi's matatu economy runs on" />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-ink">Venue</legend>
              <div className="grid grid-cols-3 gap-2">
                {(["PHYSICAL", "ONLINE", "HYBRID"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={venueType === option}
                    onClick={() => setVenueType(option)}
                    className={`rounded-control border-2 px-3 py-2 text-sm font-semibold capitalize ${
                      venueType === option ? "border-brand bg-brand/10 text-ink" : "border-ink/10 text-muted hover:border-ink/25"
                    }`}
                  >
                    {option.toLowerCase()}
                  </button>
                ))}
              </div>
            </fieldset>
            {venueType !== "ONLINE" ? (
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" maxLength={160} defaultValue={defaults?.location ?? ""} placeholder="iHub, Nairobi" />
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="registrationDeadline">Registration closes</Label>
                <Input id="registrationDeadline" name="registrationDeadline" type="datetime-local" required defaultValue={toLocalInput(defaults?.registrationDeadline)} />
              </div>
              <div>
                <Label htmlFor="startsAt">Starts</Label>
                <Input id="startsAt" name="startsAt" type="datetime-local" required defaultValue={toLocalInput(defaults?.startsAt)} />
              </div>
              <div>
                <Label htmlFor="endsAt">Ends</Label>
                <Input id="endsAt" name="endsAt" type="datetime-local" required defaultValue={toLocalInput(defaults?.endsAt)} />
              </div>
            </div>
          </Card>
        </div>

        {/* Step 2 — Problem */}
        <div className={visible(1)}>
          <Card className="space-y-5">
            <div>
              <Label htmlFor="problemStatement">Problem statement</Label>
              <Textarea id="problemStatement" name="problemStatement" required minLength={40} maxLength={8000} defaultValue={defaults?.problemStatement ?? ""} placeholder="What should teams build, for whom, and why does it matter?" />
              <p className="mt-1.5 text-xs text-muted">At least 40 characters. This is what builders decide on.</p>
            </div>
            <div>
              <Label htmlFor="rules">Rules (optional)</Label>
              <Textarea id="rules" name="rules" maxLength={8000} defaultValue={defaults?.rules ?? ""} placeholder="Tech stack constraints, team-size rules, IP terms…" />
            </div>
            <div>
              <Label htmlFor="rolesWanted">Roles wanted (optional)</Label>
              <Input id="rolesWanted" name="rolesWanted" maxLength={300} defaultValue={(defaults?.rolesWanted ?? []).join(", ")} placeholder="frontend, ai, design, fintech" />
              <p className="mt-1.5 text-xs text-muted">Comma-separated tags, up to 8.</p>
            </div>
          </Card>
        </div>

        {/* Step 3 — Prizes */}
        <div className={visible(2)}>
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Prize breakdown</p>
              <Badge variant={total >= minPoolKes ? "success" : "warning"}>
                {formatKes(total)} / min {formatKes(minPoolKes)}
              </Badge>
            </div>
            <div className="space-y-3">
              {prizes.map((prize, index) => (
                <div key={index} className="grid grid-cols-[3rem_1fr_9rem_auto] items-end gap-2">
                  <div>
                    <Label htmlFor={`place-${index}`} className="text-xs">#</Label>
                    <Input id={`place-${index}`} type="number" min={1} max={20} value={prize.place} onChange={(e) => setPrize(index, { place: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label htmlFor={`label-${index}`} className="text-xs">Label</Label>
                    <Input id={`label-${index}`} value={prize.label} onChange={(e) => setPrize(index, { label: e.target.value })} placeholder="1st place" maxLength={60} />
                  </div>
                  <div>
                    <Label htmlFor={`amount-${index}`} className="text-xs">KES</Label>
                    <Input id={`amount-${index}`} type="number" min={1000} step={500} value={prize.amount} onChange={(e) => setPrize(index, { amount: e.target.value })} placeholder="250000" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrizes((rows) => rows.filter((_, i) => i !== index))}
                    aria-label={`Remove ${prize.label || `prize ${index + 1}`}`}
                    className="mb-1 flex size-11 items-center justify-center rounded-control text-danger hover:bg-danger/10"
                    disabled={prizes.length <= 1}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                  <label className="col-span-4 flex items-center gap-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={prize.milestoneRequired}
                      onChange={(e) => setPrize(index, { milestoneRequired: e.target.checked })}
                      className="size-3.5 accent-[#222]"
                    />
                    Milestone required before the final 50% releases
                  </label>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setPrizes((rows) => [...rows, { place: rows.length + 1, label: `${rows.length + 1}${["st", "nd", "rd"][rows.length] ?? "th"} place`, amount: "", milestoneRequired: true }])
              }
            >
              <Plus aria-hidden className="size-4" /> Add place
            </Button>
            <p className="text-xs text-muted">
              The prize pool is the sum of all places. It is deposited in full before the hackathon
              goes live, plus a 5% organizer platform fee at deposit time.
            </p>
          </Card>
        </div>

        {/* Step 4 — Teams */}
        <div className={visible(3)}>
          <Card className="space-y-5">
            <div>
              <Label htmlFor="maxTeams">Maximum teams</Label>
              <Input id="maxTeams" name="maxTeams" type="number" min={2} max={200} defaultValue={defaults?.maxTeams ?? 20} />
              <p className="mt-1.5 text-xs text-muted">Teams hold up to 5 members each.</p>
            </div>
          </Card>
        </div>

        {/* Step 5 — Review */}
        <div className={visible(4)}>
          <Card className="space-y-3">
            <p className="font-display text-lg font-bold text-ink">Review &amp; create draft</p>
            <p className="text-sm text-muted">
              Publishing checks the pool, dates, and problem statement. The draft then waits for
              the Prize Vault deposit before going live. Developers see it as
              &ldquo;pending verification&rdquo;.
            </p>
            <dl className="grid gap-2 rounded-control bg-paper p-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Prize pool</dt><dd className="font-bold text-ink">{formatKes(total)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Prize places</dt><dd className="font-semibold text-ink">{prizes.filter((p) => Number(p.amount) > 0).length}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Venue</dt><dd className="font-semibold text-ink capitalize">{venueType.toLowerCase()}</dd></div>
            </dl>
          </Card>
        </div>

        <FormError message={state.error} />

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft aria-hidden className="size-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => setStep((s) => s + 1)}>
              Continue <ArrowRight aria-hidden className="size-4" />
            </Button>
          ) : (
            <Button type="submit" loading={pending}>
              {defaults?.eventId ? "Save Draft" : "Create Draft Hackathon"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

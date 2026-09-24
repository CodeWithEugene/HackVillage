"use client";

import { useActionState, useMemo, useState } from "react";
import { Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError, FormSuccess, Input, Label } from "@/components/ui/input";
import { announceWinnersAction, type PayoutActionState } from "@/services/payout/actions";
import { formatKes } from "@/lib/utils";

interface PrizeOption {
  place: number;
  label: string;
  amountKes: number;
  milestoneRequired: boolean;
}

interface TeamOption {
  teamId: string;
  name: string;
  score: number | null;
  rank: number | null;
  members: string;
  leaderHasRecipient: boolean;
}

/**
 * The announcement console (plan §8.2): map judged teams onto prize places,
 * review the money one last time, confirm. Typed confirmation above the
 * KES 250k threshold; the server re-verifies everything.
 */
export function WinnersAnnouncer({
  eventId,
  prizes,
  teams,
  poolKes,
}: {
  eventId: string;
  prizes: PrizeOption[];
  teams: TeamOption[];
  poolKes: number;
}) {
  const [state, action, pending] = useActionState<PayoutActionState, FormData>(
    announceWinnersAction,
    {}
  );
  const [selection, setSelection] = useState<Record<number, string>>({});
  const typedConfirmNeeded = poolKes > 250_000;
  const [typed, setTyped] = useState("");

  const rankedTeams = useMemo(
    () => [...teams].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)),
    [teams]
  );

  const placements = prizes
    .map((prize) => ({ place: prize.place, teamId: selection[prize.place] }))
    .filter((p): p is { place: number; teamId: string } => Boolean(p.teamId));

  const missingRecipients = placements
    .map((p) => teams.find((t) => t.teamId === p.teamId))
    .filter((t) => t && !t.leaderHasRecipient);

  const ready =
    placements.length === prizes.length &&
    missingRecipients.length === 0 &&
    (!typedConfirmNeeded || typed === "ANNOUNCE");

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="placements" value={JSON.stringify(placements)} />

      <Card>
        <CardTitle className="flex items-center gap-2">
          <Trophy aria-hidden className="size-5" /> Announce Winners &amp; Pay 50%
        </CardTitle>
        <CardDescription>
          Announcing creates the instant payout records and starts the transfers immediately —
          winners see money the same day. The final 50% waits for milestone confirmation.
        </CardDescription>

        <div className="mt-5 space-y-4">
          {prizes.map((prize) => (
            <div key={prize.place} className="rounded-card border border-ink/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor={`place-${prize.place}`} className="text-base">
                  {prize.label}
                </Label>
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold text-ink">
                    {formatKes(prize.amountKes)}
                  </span>
                  <Badge variant={prize.milestoneRequired ? "neutral" : "success"}>
                    {prize.milestoneRequired ? "50/50" : "full on the day"}
                  </Badge>
                </div>
              </div>
              <select
                id={`place-${prize.place}`}
                value={selection[prize.place] ?? ""}
                onChange={(event) =>
                  setSelection((current) => ({ ...current, [prize.place]: event.target.value }))
                }
                className="mt-2 h-11 w-full rounded-control border border-ink/15 bg-white px-3 text-ink"
              >
                <option value="">— select the winning team —</option>
                {rankedTeams.map((team) => (
                  <option key={team.teamId} value={team.teamId}>
                    {team.rank ? `#${team.rank} ` : ""}
                    {team.name} · {team.members}
                    {team.score != null ? ` · score ${team.score.toFixed(2)}` : " · unscored"}
                    {team.leaderHasRecipient ? "" : " · payout method missing"}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {missingRecipients.length > 0 ? (
          <p role="alert" className="mt-4 rounded-control border border-warning/40 bg-warning/10 p-3 text-sm font-semibold text-ink">
            Some selected team leaders haven&apos;t set a payout method — they were prompted the
            moment they won, but you can announce once they do.
          </p>
        ) : null}

        {typedConfirmNeeded ? (
          <div className="mt-4">
            <Label htmlFor="typed-confirm">
              This pool exceeds KES 250,000 — type <span className="font-mono font-bold">ANNOUNCE</span> to confirm
            </Label>
            <Input
              id="typed-confirm"
              value={typed}
              onChange={(event) => setTyped(event.target.value.toUpperCase())}
              placeholder="ANNOUNCE"
              className="font-mono"
            />
          </div>
        ) : null}

        <FormError message={state.error} />
        <FormSuccess message={state.message} />

        <Button type="submit" className="mt-5" loading={pending} disabled={!ready}>
          Announce Winners &amp; Trigger Instant Payouts
        </Button>
      </Card>
    </form>
  );
}

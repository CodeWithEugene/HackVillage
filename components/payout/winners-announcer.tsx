"use client";

import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";

import { ConfirmMoneyAction } from "@/components/patterns/confirm-money-action";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError, FormSuccess, Label } from "@/components/ui/input";
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
 * KES 250k threshold (ConfirmMoneyAction); the server re-verifies everything.
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
  const [state, setState] = useState<PayoutActionState>({});
  const [selection, setSelection] = useState<Record<number, string>>({});

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

  const ready = placements.length === prizes.length && missingRecipients.length === 0;

  const announce = async (): Promise<PayoutActionState> => {
    const formData = new FormData();
    formData.set("eventId", eventId);
    formData.set("placements", JSON.stringify(placements));
    const outcome = await announceWinnersAction({}, formData);
    setState(outcome);
    return outcome;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle className="flex items-center gap-2">
          <Trophy aria-hidden className="size-5" /> Announce Winners &amp; Pay 50%
        </CardTitle>
        <CardDescription>
          Announcing creates the instant payout records and starts the transfers immediately.
          Winners see money the same day. The final 50% waits for milestone confirmation.
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
                className="mt-2 h-11 w-full rounded-control border border-ink/15 bg-surface px-3 text-ink"
              >
                <option value="">Select the winning team</option>
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
            Some selected team leaders haven&apos;t set a payout method. They were prompted the
            moment they won, but you can announce once they do.
          </p>
        ) : null}

        <FormError message={state.error} />
        <FormSuccess message={state.message} />

        <ConfirmMoneyAction
          className="mt-5"
          amountKes={poolKes}
          confirmWord="ANNOUNCE"
          title="Announce winners and trigger the instant payouts?"
          description="This announces the selected winners and starts the instant 50% transfers immediately. It cannot be undone."
          confirmLabel="Announce Winners & Trigger Instant Payouts"
          triggerLabel="Announce Winners & Trigger Instant Payouts"
          triggerDisabled={!ready}
          onConfirm={announce}
        />
      </Card>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { Quote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError, FormSuccess, Textarea } from "@/components/ui/input";
import { endorseWinnerAction, type PowActionState } from "@/services/pow/actions";

/** Post-announcement endorsement (judges only, winners only). */
export function EndorseWinnersForm({
  eventId,
  winners,
}: {
  eventId: string;
  winners: { userId: string; name: string; handle: string; place: number; teamName: string }[];
}) {
  const [state, action, pending] = useActionState<PowActionState, FormData>(
    endorseWinnerAction,
    {}
  );

  if (winners.length === 0) return null;

  return (
    <Card>
      <CardTitle className="flex items-center gap-2">
        <Quote aria-hidden className="size-5" /> Endorse The Winners
      </CardTitle>
      <CardDescription>
        Your endorsement is permanent proof on the winner&apos;s Proof-of-Work profile, one line
        future employers will read.
      </CardDescription>

      <div className="mt-4 space-y-4">
        {winners.map((winner) => (
          <form
            key={winner.userId}
            action={action}
            className="rounded-card border border-ink/10 p-4"
          >
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="developerId" value={winner.userId} />
            <p className="text-sm font-semibold text-ink">
              {winner.name}{" "}
              <span className="font-normal text-muted">
                @{winner.handle} · {winner.place}
                {["st", "nd", "rd"][winner.place - 1] ?? "th"} place · {winner.teamName}
              </span>
            </p>
            <Textarea
              name="quote"
              required
              minLength={20}
              maxLength={500}
              className="mt-2"
              placeholder={`What makes ${winner.name.split(" ")[0]}'s work stand out?`}
            />
            <Button type="submit" size="sm" variant="secondary" className="mt-2" loading={pending}>
              Publish Endorsement
            </Button>
          </form>
        ))}
      </div>
      <FormError message={state.error} />
      <FormSuccess message={state.message} />
    </Card>
  );
}

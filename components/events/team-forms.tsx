"use client";

import { useActionState } from "react";
import { UserPlus, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError, Input, Label } from "@/components/ui/input";
import { createTeamAction, joinTeamByCodeAction, type TeamActionState } from "@/lib/teams/actions";

export function TeamForms({ eventId }: { eventId: string }) {
  const [createState, createTeam, creating] = useActionState<TeamActionState, FormData>(
    createTeamAction,
    {}
  );
  const [joinState, joinTeam, joining] = useActionState<TeamActionState, FormData>(
    joinTeamByCodeAction,
    {}
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardTitle className="flex items-center gap-2">
          <UsersRound aria-hidden className="size-5" /> Create a team
        </CardTitle>
        <CardDescription>
          You become the leader. Share the team code with teammates, or invite them by handle.
        </CardDescription>
        <form action={createTeam} className="mt-4 space-y-4">
          <input type="hidden" name="eventId" value={eventId} />
          <div>
            <Label htmlFor="team-name">Team name</Label>
            <Input id="team-name" name="name" required minLength={3} maxLength={40} placeholder="The Salamanders" />
          </div>
          <FormError message={createState.error} />
          <Button type="submit" loading={creating}>
            Create team
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle className="flex items-center gap-2">
          <UserPlus aria-hidden className="size-5" /> Join with a team code
        </CardTitle>
        <CardDescription>
          Got a code from a team leader? Drop it here to join their team.
        </CardDescription>
        <form action={joinTeam} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="team-code">Team code</Label>
            <Input id="team-code" name="code" required minLength={6} maxLength={10} className="font-mono" placeholder="hkm3npw7" />
          </div>
          <FormError message={joinState.error} />
          <Button type="submit" variant="secondary" loading={joining}>
            Join team
          </Button>
        </form>
      </Card>
    </div>
  );
}

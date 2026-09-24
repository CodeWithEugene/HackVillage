"use client";

import { useActionState, useTransition } from "react";
import { Copy, DoorOpen, Lock, LockOpen, Trash2, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError, Input, Label } from "@/components/ui/input";
import {
  disbandTeamAction,
  inviteMemberAction,
  leaveTeamAction,
  toggleTeamLockAction,
  type TeamActionState,
} from "@/lib/teams/actions";

interface Member {
  userId: string;
  name: string | null;
  handle: string;
  status: "INVITED" | "JOINED" | "LEFT" | "DECLINED";
  isLeader: boolean;
}

export function TeamPanel({
  teamId,
  name,
  inviteCode,
  status,
  members,
  isLeader,
  canManage,
  notice,
}: {
  teamId: string;
  name: string;
  inviteCode: string;
  status: "OPEN" | "LOCKED" | "DISBANDED";
  members: Member[];
  isLeader: boolean;
  canManage: boolean;
  notice?: string;
}) {
  const [inviteState, invite, inviting] = useActionState<TeamActionState, FormData>(
    inviteMemberAction,
    {}
  );
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            {name}{" "}
            <Badge variant={status === "OPEN" ? "success" : status === "LOCKED" ? "warning" : "danger"}>
              {status === "OPEN" ? "Open to members" : status === "LOCKED" ? "Locked" : "Disbanded"}
            </Badge>
          </CardTitle>
          <CardDescription>Your team for this event — up to 5 members.</CardDescription>
        </div>
        {canManage && status !== "DISBANDED" ? (
          <span className="flex items-center gap-2 rounded-control bg-paper px-3 py-2">
            <code className="font-mono text-lg font-bold tracking-wider text-ink">{inviteCode}</code>
            <button
              type="button"
              aria-label="Copy invite code"
              className="rounded-control p-1 hover:bg-ink/5"
              onClick={() => void navigator.clipboard?.writeText(inviteCode)}
            >
              <Copy aria-hidden className="size-4" />
            </button>
          </span>
        ) : null}
      </div>

      {notice ? <FormError message={notice} /> : null}

      <ul className="mt-4 divide-y divide-ink/5">
        {members.map((member) => (
          <li key={member.userId} className="flex items-center justify-between gap-3 py-2.5">
            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
              {member.name ?? `@${member.handle}`}
              {member.isLeader ? <Badge variant="brand">leader</Badge> : null}
              <span className="font-normal text-muted">@{member.handle}</span>
            </span>
            <Badge variant={member.status === "JOINED" ? "success" : member.status === "INVITED" ? "warning" : "neutral"}>
              {member.status.toLowerCase()}
            </Badge>
          </li>
        ))}
      </ul>

      {canManage && status !== "DISBANDED" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <form action={invite} className="space-y-3">
            <input type="hidden" name="teamId" value={teamId} />
            <div>
              <Label htmlFor="invite-handle">Invite by handle</Label>
              <Input id="invite-handle" name="handle" required placeholder="@their-handle" maxLength={30} />
            </div>
            <FormError message={inviteState.error} />
            <Button type="submit" size="sm" variant="secondary" loading={inviting}>
              <UserPlus aria-hidden className="size-4" /> Send invite
            </Button>
          </form>

          <div className="flex flex-wrap items-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={pending}
              onClick={() => startTransition(() => void toggleTeamLockAction(teamId))}
            >
              {status === "OPEN" ? (
                <>
                  <Lock aria-hidden className="size-4" /> Lock team
                </>
              ) : (
                <>
                  <LockOpen aria-hidden className="size-4" /> Unlock team
                </>
              )}
            </Button>
            {isLeader ? (
              <Button
                type="button"
                size="sm"
                variant="danger"
                loading={pending}
                onClick={() => startTransition(() => void disbandTeamAction(teamId))}
              >
                <Trash2 aria-hidden className="size-4" /> Disband
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={pending}
                onClick={() => startTransition(() => void leaveTeamAction(teamId))}
              >
                <DoorOpen aria-hidden className="size-4" /> Leave team
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

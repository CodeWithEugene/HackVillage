"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { acceptTeamInviteAction, declineTeamInviteAction } from "@/lib/teams/actions";

export function InviteActions({ teamId }: { teamId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        loading={pending}
        onClick={() => startTransition(() => void acceptTeamInviteAction(teamId))}
      >
        <Check aria-hidden className="size-4" /> Accept
      </Button>
      <Button
        size="sm"
        variant="secondary"
        loading={pending}
        onClick={() => startTransition(() => void declineTeamInviteAction(teamId))}
      >
        <X aria-hidden className="size-4" /> Decline
      </Button>
    </div>
  );
}

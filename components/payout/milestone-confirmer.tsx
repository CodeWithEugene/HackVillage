"use client";

import { Handshake } from "lucide-react";

import { ConfirmMoneyAction } from "@/components/patterns/confirm-money-action";
import { confirmMilestoneAction } from "@/services/payout/actions";

/**
 * Releases the final 50% for a winner. The handover used to be a single
 * unconfirmed click; now it passes through the money-action confirm gate
 * (typed confirmation above the KES 250k threshold, keyed on the milestone
 * amount).
 */
export function MilestoneConfirmer({
  winnerId,
  amountKes,
}: {
  winnerId: string;
  amountKes: number;
}) {
  return (
    <ConfirmMoneyAction
      className="mt-3"
      amountKes={amountKes}
      confirmWord="RELEASE"
      title="Confirm the handover and release the final 50%?"
      description="Confirming releases the milestone tranche to the team leader immediately. Only confirm once the winner has handed over what the milestone requires."
      confirmLabel="Confirm handover, release final 50%"
      triggerLabel={
        <>
          <Handshake aria-hidden className="size-4" /> Confirm handover, release final 50%
        </>
      }
      triggerVariant="secondary"
      triggerSize="sm"
      onConfirm={() => confirmMilestoneAction(winnerId)}
    />
  );
}

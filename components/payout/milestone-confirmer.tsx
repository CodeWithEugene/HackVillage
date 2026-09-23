"use client";

import { useState, useTransition } from "react";
import { Handshake } from "lucide-react";

import { Button } from "@/components/ui/button";
import { confirmMilestoneAction } from "@/services/payout/actions";

export function MilestoneConfirmer({ winnerId }: { winnerId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="mt-3">
      {error ? (
        <p role="alert" className="mb-2 rounded-control border border-danger/40 bg-danger/10 p-2 text-xs font-semibold text-danger">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="mb-2 rounded-control border border-success/40 bg-success/10 p-2 text-xs font-semibold text-success">
          {message}
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await confirmMilestoneAction(winnerId);
            if (result.error) {
              setError(result.error);
              setMessage(null);
            } else {
              setMessage(result.message ?? "Milestone confirmed.");
              setError(null);
            }
          })
        }
      >
        <Handshake aria-hidden className="size-4" /> Confirm handover — release final 50%
      </Button>
    </div>
  );
}

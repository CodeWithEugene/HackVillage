"use client";

import { useState, useTransition } from "react";
import { Gavel } from "lucide-react";

import { Button } from "@/components/ui/button";
import { openJudgingAction } from "@/services/judging/actions";

export function OpenJudgingButton({ eventId }: { eventId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-3 rounded-control border border-danger/40 bg-danger/10 p-3 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
      <Button
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await openJudgingAction(eventId);
            if (result.error) setError(result.error);
          })
        }
      >
        <Gavel aria-hidden className="size-4" /> Open judging
      </Button>
    </div>
  );
}

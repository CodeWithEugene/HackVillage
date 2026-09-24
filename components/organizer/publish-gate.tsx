"use client";

import { useTransition } from "react";
import { Rocket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { publishEventAction } from "@/lib/events/actions";

/**
 * Draft → PENDING_DEPOSIT gate. The publish check runs server-side; the
 * error (if any) surfaces here.
 */
export function PublishGate({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="border-brand">
      <CardTitle className="flex items-center gap-2">
        <Rocket aria-hidden className="size-5" /> Ready To Publish?
      </CardTitle>
      <CardDescription>
        Publishing makes the event publicly visible as <strong>pending deposit</strong>. The
        event goes live when the prize pool is locked in the Prize Vault (Phase 3).
      </CardDescription>
      {error ? (
        <p role="alert" className="mt-3 rounded-control border border-danger/40 bg-danger/10 p-3 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
      <Button
        className="mt-4"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await publishEventAction(eventId);
            if (result.error) setError(result.error);
          })
        }
      >
        Publish event
      </Button>
    </Card>
  );
}

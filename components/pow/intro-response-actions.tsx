"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { respondToIntroductionAction } from "@/services/pow/actions";

export function IntroResponseActions({ introductionId }: { introductionId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-3 flex gap-2">
      <Button
        size="sm"
        loading={pending}
        onClick={() => startTransition(() => void respondToIntroductionAction(introductionId, true))}
      >
        <Check aria-hidden className="size-4" /> Accept — exchange contacts
      </Button>
      <Button
        size="sm"
        variant="secondary"
        loading={pending}
        onClick={() => startTransition(() => void respondToIntroductionAction(introductionId, false))}
      >
        <X aria-hidden className="size-4" /> Decline
      </Button>
    </div>
  );
}

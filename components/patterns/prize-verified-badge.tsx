import { BadgeCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The trust mark (plan §13.2). Shows only when 100% of the pool is actually
 * locked in escrow — never decorative, never approximated.
 */
export function PrizeVerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-xs font-bold text-ink shadow-card",
        className
      )}
    >
      <BadgeCheck aria-hidden className="size-3.5" />
      Prize Verified
    </span>
  );
}

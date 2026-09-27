import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * The loading-state primitive (plan §8.4 four-state model): a pulsing block
 * that mirrors the shape of the content it stands in for. Always aria-hidden —
 * the route's loading.tsx provides the accessible "loading" context.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div aria-hidden className={cn("animate-pulse rounded-control bg-ink/10", className)} {...props} />
  );
}

/** A card-shaped skeleton matching components/ui/card.tsx. */
export function SkeletonCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-card border border-ink/10 bg-surface p-6 shadow-card",
        className,
      )}
      {...props}
    />
  );
}

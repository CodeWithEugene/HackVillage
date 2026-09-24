import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

/**
 * The platform-wide empty state (plan §8.4): an icon in a brand circle, one
 * human sentence, and at most one next-step CTA. Never a bare "no data".
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-card border border-ink/10 bg-surface px-6 py-14 text-center shadow-card",
        className
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-brand">
        <Icon aria-hidden className="size-7 text-ink" />
      </span>
      <div className="max-w-md">
        <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

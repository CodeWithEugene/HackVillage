import { Check } from "lucide-react";

import { currentPhase, EVENT_PHASES } from "@/lib/events/lifecycle";
import { cn } from "@/lib/utils";

/**
 * The one status timeline used everywhere (P1 — one mental model): event
 * detail page, vault panel, workspace. Phases: vault → live → judging →
 * winners → settled.
 */
export function StatusTimeline({ status }: { status: Parameters<typeof currentPhase>[0] }) {
  const reached = currentPhase(status);
  const reachedIndex = EVENT_PHASES.findIndex((phase) => phase.key === reached);

  return (
    <ol className="flex items-center gap-2" aria-label="Event status">
      {EVENT_PHASES.map((phase, index) => {
        const done = index <= reachedIndex;
        return (
          <li key={phase.key} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-[10px] font-bold",
                done ? "bg-ink text-brand" : "bg-ink/8 text-muted"
              )}
              aria-hidden
            >
              {done ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "text-xs font-semibold",
                done ? "text-ink" : "text-muted"
              )}
            >
              {phase.label}
            </span>
            {index < EVENT_PHASES.length - 1 ? (
              <span className={cn("h-px w-4 sm:w-6", done ? "bg-ink" : "bg-ink/15")} aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

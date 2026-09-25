import { Check } from "lucide-react";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatDateTime, keyDates } from "@/lib/events/format";
import { cn } from "@/lib/utils";

/** The hackathon's commitments in time: when things close, start, and get delivered. */
export function KeyDatesCard({
  event,
}: {
  event: { registrationDeadline: Date; startsAt: Date; endsAt: Date; mediaDeadlineAt: Date | null };
}) {
  const dates = keyDates(event);

  return (
    <Card>
      <CardTitle>Key Dates</CardTitle>
      <ol className="mt-3 text-sm">
        {dates.map((date) => (
          <li
            key={date.label}
            className="flex items-start gap-3 border-b border-ink/5 py-3 last:border-0"
          >
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                date.state === "done" && "bg-ink text-brand",
                date.state === "next" && "bg-brand ring-4 ring-brand/20",
                date.state === "upcoming" && "border border-ink/20"
              )}
            >
              {date.state === "done" ? <Check className="size-3" /> : null}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("font-semibold", date.state === "done" ? "text-muted" : "text-ink")}>
                {date.label}
                {date.state === "next" ? (
                  <span className="ml-2 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                    Next
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                <time dateTime={date.at.toISOString()}>{formatDateTime(date.at)}</time>
              </p>
            </div>
          </li>
        ))}
      </ol>
      <CardDescription>All times are Nairobi time (EAT).</CardDescription>
    </Card>
  );
}

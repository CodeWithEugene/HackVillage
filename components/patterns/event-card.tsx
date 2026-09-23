import Link from "next/link";
import { ArrowRight, MapPin, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PrizeVerifiedBadge } from "@/components/patterns/prize-verified-badge";
import {
  currentPhase,
  isPrizeVerified,
  registrationOpen,
  STATUS_LABELS,
  statusTone,
  type EventStatus,
} from "@/lib/events/lifecycle";
import { cn } from "@/lib/utils";
import { formatKes } from "@/lib/utils";

export interface EventCardData {
  slug: string;
  title: string;
  summary?: string | null;
  venueType: "PHYSICAL" | "ONLINE" | "HYBRID";
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
  registrationDeadline: Date;
  status: EventStatus;
  prizeVerifiedAt?: Date | null;
  poolKes: number;
  teamCount: number;
  orgName: string;
  orgTrustScore: number;
}

export function EventCard({ event }: { event: EventCardData }) {
  const verified = isPrizeVerified(event.status, event.prizeVerifiedAt);
  const open = registrationOpen(event);
  const now = new Date();

  return (
    <Link href={`/events/${event.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col transition-shadow group-hover:shadow-lg">
        <div className="flex items-start justify-between gap-2">
          {verified ? (
            <PrizeVerifiedBadge />
          ) : (
            <Badge variant={statusTone(event.status)}>{STATUS_LABELS[event.status]}</Badge>
          )}
          <span className="text-right text-xs text-muted">{event.orgName}</span>
        </div>

        <h3 className="mt-3 font-display text-lg font-bold leading-snug text-ink group-hover:underline">
          {event.title}
        </h3>
        {event.summary ? (
          <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted">{event.summary}</p>
        ) : null}

        <p className="mt-3 font-display text-2xl font-bold text-ink">
          {formatKes(event.poolKes)}
        </p>
        <p className="text-xs text-muted">
          prize pool{verified ? " · locked in escrow" : " · pending verification"}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <Users aria-hidden className="size-3.5" />
            {event.teamCount} team{event.teamCount === 1 ? "" : "s"}
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin aria-hidden className="size-3.5" />
            {event.venueType === "ONLINE"
              ? "Online"
              : (event.location ?? event.venueType.toLowerCase())}
          </div>
          <div className="col-span-2">
            {new Date(event.startsAt).toLocaleDateString("en-KE", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
        </dl>

        <div className="mt-auto flex items-center justify-between pt-4 text-sm">
          <span
            className={cn(
              "font-semibold",
              open ? "text-success" : new Date(event.endsAt) < now ? "text-muted" : "text-ink"
            )}
          >
            {open
              ? `Register by ${new Date(event.registrationDeadline).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}`
              : event.status === "PENDING_DEPOSIT"
                ? "Awaiting deposit"
                : currentPhase(event.status) === "settled"
                  ? "Concluded"
                  : STATUS_LABELS[event.status]}
          </span>
          <ArrowRight
            aria-hidden
            className="size-4 text-ink transition-transform group-hover:translate-x-0.5"
          />
        </div>
      </Card>
    </Link>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { STATUS_LABELS } from "@/lib/events/lifecycle";
import { formatKes } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin · Events" };

export default async function AdminEventsPage() {
  const events = await prisma.event.findMany({
    include: {
      org: { select: { name: true } },
      prizes: { select: { amountKes: true } },
      _count: { select: { teams: true, registrations: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-ink">Events</h1>

      <Card>
        <CardTitle>All Events ({events.length})</CardTitle>
        <ul className="mt-3 divide-y divide-ink/5">
          {events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <span>
                <Link href={`/events/${event.slug}`} className="font-semibold text-ink underline">
                  {event.title}
                </Link>
                <span className="block text-xs text-muted">
                  {event.org.name} · {formatKes(event.prizes.reduce((sum, p) => sum + p.amountKes, 0))} pool
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral">{event._count.registrations} reg</Badge>
                <Badge variant="neutral">{event._count.teams} teams</Badge>
                <Badge
                  variant={
                    event.status === "DRAFT"
                      ? "neutral"
                      : event.status === "PENDING_DEPOSIT"
                        ? "warning"
                        : "success"
                  }
                >
                  {STATUS_LABELS[event.status]}
                </Badge>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

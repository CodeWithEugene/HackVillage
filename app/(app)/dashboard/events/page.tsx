import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { isPrizeVerified, registrationOpen, STATUS_LABELS } from "@/lib/events/lifecycle";

export const metadata: Metadata = { title: "My Events" };

export default async function DashboardEventsPage() {
  const user = await requireOnboardedUser();

  const registrations = await prisma.registration.findMany({
    where: { userId: user.id, status: { not: "CANCELLED" } },
    include: {
      event: {
        select: {
          slug: true,
          title: true,
          startsAt: true,
          endsAt: true,
          status: true,
          registrationDeadline: true,
          prizeVerifiedAt: true,
          org: { select: { name: true } },
        },
      },
    },
    orderBy: { event: { startsAt: "asc" } },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">My Events</h1>
        <Link href="/events">
          <Button variant="secondary">Browse Events</Button>
        </Link>
      </header>

      {registrations.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="You haven't registered for any events"
          description="Find a Prize Verified event that matches your skills — your Proof-of-Work record starts with your first one."
          action={
            <Link href="/events">
              <Button>Browse Events</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {registrations.map(({ id, event }) => {
            const verified = isPrizeVerified(event.status, event.prizeVerifiedAt);
            const open = registrationOpen(event);
            return (
              <li key={id}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {verified ? (
                        <Badge variant="brand">Prize Verified</Badge>
                      ) : (
                        <Badge variant="warning">{STATUS_LABELS[event.status]}</Badge>
                      )}
                      <span className="text-xs text-muted">{event.org.name}</span>
                    </div>
                    <p className="mt-1.5 font-display text-lg font-bold text-ink">{event.title}</p>
                    <p className="text-xs text-muted">
                      {new Date(event.startsAt).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {open ? (
                      <form action={`/api/events/${event.slug}/cancel`} method="post">
                        <Button type="submit" variant="ghost" size="sm">
                          Cancel
                        </Button>
                      </form>
                    ) : null}
                    <Link href={`/events/${event.slug}/workspace`}>
                      <Button size="sm">{open ? "Workspace" : "View"}</Button>
                    </Link>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

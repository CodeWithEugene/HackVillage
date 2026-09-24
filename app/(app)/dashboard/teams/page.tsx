import type { Metadata } from "next";
import Link from "next/link";
import { UsersRound } from "lucide-react";

import { InviteActions } from "@/components/events/invite-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "My Teams" };

export default async function DashboardTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ join?: string }>;
}) {
  const [{ join }, user] = await Promise.all([searchParams, requireOnboardedUser()]);

  const memberships = await prisma.teamMember.findMany({
    where: { userId: user.id, status: "JOINED" },
    include: {
      team: {
        include: {
          event: { select: { slug: true, title: true } },
          _count: { select: { members: { where: { status: "JOINED" } } } },
        },
      },
    },
  });

  const invites = await prisma.teamMember.findMany({
    where: {
      userId: user.id,
      status: "INVITED",
      team: { status: { not: "DISBANDED" } },
    },
    include: {
      team: {
        include: {
          event: { select: { title: true } },
          leader: { select: { handle: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">My teams</h1>
        <p className="mt-1 text-sm text-muted">Invitations and the teams you build with.</p>
      </header>

      {join ? (
        <p role="alert" className="rounded-control border border-warning/40 bg-warning/10 p-3 text-sm font-semibold text-ink">
          {join}
        </p>
      ) : null}

      {invites.length > 0 ? (
        <Card>
          <h2 className="font-display text-lg font-bold text-ink">Invitations</h2>
          <ul className="mt-3 space-y-3">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-ink/10 p-3"
              >
                <span className="text-sm">
                  <strong className="text-ink">{invite.team.name}</strong>
                  <span className="text-muted"> · {invite.team.event.title} · led by @{invite.team.leader.handle}</span>
                </span>
                <InviteActions teamId={invite.teamId} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {memberships.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No teams yet"
          description="Register for an event, then create a team or join one with a leader's code — teams hold up to 5 members."
          action={
            <Link href="/events">
              <Button>Find An Event</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {memberships.map(({ id, team }) => (
            <li key={id}>
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-lg font-bold text-ink">{team.name}</p>
                    {team.leaderId === user.id ? <Badge variant="brand">leader</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {team.event.title} · {team._count.members}/5 members
                  </p>
                </div>
                <Link href={`/events/${team.event.slug}/workspace`}>
                  <Button size="sm">Workspace</Button>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

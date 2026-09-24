import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UsersRound } from "lucide-react";

import { InviteActions } from "@/components/events/invite-actions";
import { SubmissionForm } from "@/components/events/submission-form";
import { TeamForms } from "@/components/events/team-forms";
import { TeamPanel } from "@/components/events/team-panel";
import { StatusTimeline } from "@/components/patterns/status-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { registrationOpen, submissionWindowOpen } from "@/lib/events/lifecycle";

export const metadata: Metadata = { title: "Team workspace" };

const NOTICES: Record<string, string> = {
  "leader": "Leaders can't leave — disband the team instead (only before submitting).",
  "team-first": "Leave your team before cancelling your registration.",
  "submitted": "A team with a submitted project can't be disbanded.",
};

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ leave?: string; disband?: string }>;
}) {
  const [{ slug }, { leave, disband }, user] = await Promise.all([
    params,
    searchParams,
    requireUser(),
  ]);

  const event = await prisma.event.findFirst({
    where: { slug, publishedAt: { not: null } },
    include: { _count: { select: { teams: { where: { status: { not: "DISBANDED" } } } } } },
  });
  if (!event) notFound();

  const registration = await prisma.registration.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: user.id } },
  });
  if (!registration || registration.status !== "REGISTERED") {
    return (
      <EmptyState
        icon={UsersRound}
        title="You're not registered for this event"
        description="Register from the event page first — then this workspace becomes your team's build hub."
        action={
          <a href={`/events/${event.slug}`}>
            <Button>Go to event page</Button>
          </a>
        }
      />
    );
  }

  const notice = NOTICES[leave ?? ""] ?? NOTICES[disband ?? ""];

  const myMembership = await prisma.teamMember.findFirst({
    where: { userId: user.id, status: "JOINED", team: { eventId: event.id } },
    include: {
      team: {
        include: {
          members: { include: { user: { select: { id: true, name: true, handle: true } } } },
          submission: true,
        },
      },
    },
  });

  const pendingInvites = await prisma.teamMember.findMany({
    where: {
      userId: user.id,
      status: "INVITED",
      team: { eventId: event.id, status: { not: "DISBANDED" } },
    },
    include: {
      team: {
        include: {
          leader: { select: { name: true, handle: true } },
          _count: { select: { members: { where: { status: "JOINED" } } } },
        },
      },
    },
  });

  const windowOpen = submissionWindowOpen(event);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{event.title}</h1>
          <p className="mt-1 text-sm text-muted">Team workspace · {event._count.teams} teams registered</p>
        </div>
        <Badge variant="brand">Registered ✓</Badge>
      </header>

      <Card>
        <div className="overflow-x-auto">
          <StatusTimeline status={event.status} />
        </div>
      </Card>

      {pendingInvites.length > 0 ? (
        <Card>
          <CardTitle>Team invitations</CardTitle>
          <ul className="mt-3 space-y-3">
            {pendingInvites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-ink/10 p-3"
              >
                <span className="text-sm">
                  <strong className="text-ink">{invite.team.name}</strong>
                  <span className="text-muted">
                    {" "}
                    · led by @{invite.team.leader.handle} ·{" "}
                    {invite.team._count.members}/5 members
                  </span>
                </span>
                <InviteActions teamId={invite.teamId} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {myMembership ? (
        <TeamPanel
          teamId={myMembership.team.id}
          name={myMembership.team.name}
          inviteCode={myMembership.team.inviteCode}
          status={myMembership.team.status}
          isLeader={myMembership.team.leaderId === user.id}
          canManage={registrationOpen(event)}
          notice={notice}
          members={myMembership.team.members.map((member) => ({
            userId: member.user.id,
            name: member.user.name,
            handle: member.user.handle,
            status: member.status,
            isLeader: member.userId === myMembership!.team.leaderId,
          }))}
        />
      ) : (
        <>
          {notice ? (
            <p role="alert" className="rounded-control border border-warning/40 bg-warning/10 p-3 text-sm font-semibold text-ink">
              {notice}
            </p>
          ) : null}
          {registrationOpen(event) ? (
            <TeamForms eventId={event.id} />
          ) : (
            <Card>
              <CardTitle>Registration has closed</CardTitle>
              <CardDescription>
                Teams locked when registration closed. If you already have a team, it appears above.
              </CardDescription>
            </Card>
          )}
        </>
      )}

      {myMembership && myMembership.team.status !== "DISBANDED" ? (
        windowOpen || myMembership.team.submission ? (
          <SubmissionForm
            teamId={myMembership.team.id}
            members={myMembership.team.members
              .filter((m) => m.status === "JOINED")
              .map((m) => ({ userId: m.user.id, name: m.user.name, handle: m.user.handle }))}
            defaults={
              myMembership.team.submission
                ? {
                    repoUrl: myMembership.team.submission.repoUrl,
                    demoUrl: myMembership.team.submission.demoUrl,
                    description: myMembership.team.submission.description,
                    split: myMembership.team.submission.splitDeclaration as
                      | { userId: string; percent: number }[]
                      | null,
                  }
                : null
            }
            windowOpen={windowOpen}
          />
        ) : (
          <Card>
            <CardTitle>Submissions open when the event starts</CardTitle>
            <CardDescription>
              The submission form (repo, demo, description, and the prize split declaration) unlocks
              when the event goes live.
            </CardDescription>
          </Card>
        )
      ) : null}

      <Card>
        <CardTitle>What happens after announcement</CardTitle>
        <CardDescription>
          Endorse the winners you judged —{" "}
          <a href={`/judge/events/${event.slug}/endorse`} className="underline hover:text-ink">
            write endorsements
          </a>{" "}
          once results are announced. Your one-liner becomes permanent proof on their
          Proof-of-Work profiles.
        </CardDescription>
      </Card>
    </div>
  );
}

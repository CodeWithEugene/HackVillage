import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { STATUS_LABELS } from "@/lib/events/lifecycle";

export const metadata: Metadata = { title: "Team Queue" };

export default async function JudgeEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, user] = await Promise.all([params, requireOnboardedUser()]);

  const event = await prisma.event.findFirst({
    where: { slug },
    include: { rubric: true },
  });
  if (!event) notFound();

  const assignment = await prisma.judgeAssignment.findFirst({
    where: { eventId: event.id, userId: user.id, status: "ACTIVE" },
  });
  if (!assignment) notFound();

  const teams = await prisma.team.findMany({
    where: { eventId: event.id, status: { not: "DISBANDED" }, submission: { isNot: null } },
    include: {
      members: {
        where: { status: "JOINED" },
        include: { user: { select: { handle: true, name: true } } },
      },
      submission: { select: { repoUrl: true, demoUrl: true, description: true } },
      judgingProgress: { where: { judgeId: user.id }, select: { finalizedAt: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const judgingOpen = event.status === "JUDGING";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{event.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {teams.length} submitted team{teams.length === 1 ? "" : "s"} ·{" "}
            {event.rubric
              ? `${(event.rubric.criteria as unknown as { label: string }[]).length} criteria`
              : "rubric pending"}
          </p>
        </div>
        <Badge variant={judgingOpen ? "brand" : "neutral"}>
          {judgingOpen ? "Judging open" : STATUS_LABELS[event.status]}
        </Badge>
      </header>

      {!judgingOpen ? (
        <Card>
          <p className="text-sm text-muted">
            Judging opens when the event ends and the organizer opens the review window. Come back
            then — you can review the submissions below in the meantime.
          </p>
        </Card>
      ) : null}

      {teams.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">No submissions yet — the queue fills as teams submit.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {teams.map((team) => {
            const finalized = team.judgingProgress[0]?.finalizedAt != null;
            return (
              <li key={team.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-lg font-bold text-ink">{team.name}</p>
                      <Badge variant={finalized ? "success" : "warning"}>
                        {finalized ? "finalized" : "pending review"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {team.members.map((m) => `@${m.user.handle}`).join(" · ")}
                    </p>
                    <p className="mt-1 truncate text-xs">
                      <a
                        href={team.submission?.repoUrl}
                        className="text-ink underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {team.submission?.repoUrl.replace(/^https?:\/\//, "")}
                      </a>
                    </p>
                  </div>
                  <Link href={`/judge/events/${event.slug}/teams/${team.id}`}>
                    <Button size="sm" variant={finalized ? "secondary" : "primary"}>
                      {finalized ? "Review" : "Score Team"}
                    </Button>
                  </Link>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

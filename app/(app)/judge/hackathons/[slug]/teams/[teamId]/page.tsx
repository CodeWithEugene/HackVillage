import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ScoringScreen } from "@/components/judging/scoring-screen";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import type { Criterion, FeedbackKind } from "@/lib/judging/compute";

export const metadata: Metadata = { title: "Score Team" };

export default async function JudgeTeamPage({
  params,
}: {
  params: Promise<{ slug: string; teamId: string }>;
}) {
  const [{ slug, teamId }, user] = await Promise.all([params, requireOnboardedUser()]);

  const event = await prisma.event.findFirst({
    where: { slug },
    include: { rubric: true },
  });
  if (!event) notFound();

  const assignment = await prisma.judgeAssignment.findFirst({
    where: { eventId: event.id, userId: user.id, status: "ACTIVE" },
  });
  if (!assignment) notFound();

  const team = await prisma.team.findFirst({
    where: { id: teamId, eventId: event.id, submission: { isNot: null } },
    include: {
      members: {
        where: { status: "JOINED" },
        include: { user: { select: { handle: true, name: true } } },
      },
      submission: true,
      scores: { where: { judgeId: user.id } },
      feedback: { where: { judgeId: user.id }, orderBy: { createdAt: "asc" } },
      judgingProgress: { where: { judgeId: user.id } },
    },
  });
  if (!team) notFound();

  const criteria = ((event.rubric?.criteria as unknown as Criterion[]) ?? []).slice();
  const existingScores = Object.fromEntries(
    team.scores.map((score) => [score.criterionId, score.value])
  );
  const finalized = team.judgingProgress[0]?.finalizedAt != null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{team.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {team.members.map((m) => `@${m.user.handle}`).join(" · ")}
          </p>
        </div>
        <Link href={`/judge/hackathons/${event.slug}`} className="text-sm font-semibold text-ink underline">
          ← Back to queue
        </Link>
      </header>

      <Card>
        <CardTitle>Submission</CardTitle>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">
          {team.submission?.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <a
            href={team.submission?.repoUrl}
            className="font-semibold text-ink underline"
            target="_blank"
            rel="noreferrer"
          >
            Repository ↗
          </a>
          {team.submission?.demoUrl ? (
            <a
              href={team.submission.demoUrl}
              className="font-semibold text-ink underline"
              target="_blank"
              rel="noreferrer"
            >
              Demo ↗
            </a>
          ) : null}
        </div>
        <CardDescription>
          Open the repo and demo in separate tabs. Rubric scoring follows below.
        </CardDescription>
      </Card>

      <ScoringScreen
        teamId={team.id}
        teamName={team.name}
        criteria={criteria}
        existingScores={existingScores}
        feedback={team.feedback.map((f) => ({
          id: f.id,
          kind: f.kind as FeedbackKind,
          point: f.point,
        }))}
        finalized={finalized}
        judgingOpen={event.status === "JUDGING"}
      />
    </div>
  );
}

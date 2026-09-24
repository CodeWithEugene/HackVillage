import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JudgesManager } from "@/components/judging/judges-manager";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { judgingReadiness } from "@/services/judging/results";

export const metadata: Metadata = { title: "Judges" };

export default async function EventJudgesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, user] = await Promise.all([params, requireUser()]);

  const event = await prisma.event.findFirst({
    where: { slug },
    include: { org: { include: { members: { where: { userId: user.id, status: "ACTIVE" } } } } },
  });
  if (!event) notFound();
  const membership = event.org.members[0];
  if (!membership || membership.role === "MEMBER") notFound();

  const assignments = await prisma.judgeAssignment.findMany({
    where: { eventId: event.id },
    include: {
      user: { select: { name: true, handle: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  const teamsTotal = await prisma.team.count({
    where: { eventId: event.id, status: { not: "DISBANDED" }, submission: { isNot: null } },
  });
  const readiness = await judgingReadiness(event.id);
  const progressRows = await prisma.judgingProgress.findMany({
    where: {
      team: { eventId: event.id },
      finalizedAt: { not: null },
    },
    select: { judgeId: true },
  });
  const finalizedByJudge = new Map<string, number>();
  for (const row of progressRows) {
    finalizedByJudge.set(row.judgeId, (finalizedByJudge.get(row.judgeId) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">Judges &amp; Review</h1>
        <p className="mt-1 text-sm text-muted">
          {event.title} ·{" "}
          <span className="font-semibold text-ink">
            {readiness.fullyJudgedTeams}/{readiness.teamsWithSubmission} teams fully judged
          </span>{" "}
          by {readiness.activeJudges} active judge{readiness.activeJudges === 1 ? "" : "s"}
        </p>
      </header>

      <JudgesManager
        eventId={event.id}
        judges={assignments.map((assignment) => ({
          assignmentId: assignment.id,
          name: assignment.user.name ?? `@${assignment.user.handle}`,
          handle: assignment.user.handle,
          status: assignment.status,
          finalizedCount: finalizedByJudge.get(assignment.userId) ?? 0,
          teamsTotal,
        }))}
      />

      <Card>
        <CardTitle>How Results Compute</CardTitle>
        <CardDescription>
          Per judge: Σ(criterion score × weight) ÷ Σweights. Per team: the mean across finalized
          judge reviews. Teams rank by that weighted score — ties share a rank. The rubric locks
          the moment judging opens, and results count only finalized reviews.
        </CardDescription>
      </Card>
    </div>
  );
}

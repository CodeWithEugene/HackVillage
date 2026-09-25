import Link from "next/link";
import { Gavel } from "lucide-react";

import { OpenJudgingButton } from "@/components/judging/open-judging-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import type { EventStatus } from "@/lib/events/lifecycle";
import { computeEventResults, judgingReadiness } from "@/services/judging/results";

/**
 * The command center's judging block: before judging opens it's the
 * open-judging gate; while open it's live standings from finalized reviews
 * only (plan §17 Phase 4).
 */
export async function JudgingSection({
  eventId,
  slug,
  endsAt,
  status,
}: {
  eventId: string;
  slug: string;
  endsAt: Date;
  status: EventStatus;
}) {
  const readiness = await judgingReadiness(eventId);
  const ended = endsAt.getTime() <= Date.now();
  const judging = status === "JUDGING";

  const results = judging
    ? await computeEventResults(eventId)
    : null;
  const teamNames = results
    ? await prisma.team.findMany({
        where: { id: { in: results.results.map((r) => r.teamId) } },
        select: { id: true, name: true },
      })
    : [];
  const nameFor = (teamId: string) =>
    teamNames.find((team) => team.id === teamId)?.name ?? "N/A";

  return (
    <Card>
      <CardTitle className="flex items-center gap-2">
        <Gavel aria-hidden className="size-5" /> Judging
      </CardTitle>

      {!judging ? (
        <>
          <CardDescription>
            {ended
              ? "The hackathon has ended. Opening judging locks the rubric and gives your judges the team queue."
              : "Judging opens after the hackathon ends. Invite judges and tune the rubric meanwhile."}
          </CardDescription>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href={`/organizer/hackathons/${slug}/judges`}>
              <Button variant="secondary" arrow>Manage Judges</Button>
            </Link>
            <Link href={`/organizer/hackathons/${slug}/rubric`}>
              <Button variant="secondary" arrow>Edit Rubric</Button>
            </Link>
            {ended ? <OpenJudgingButton eventId={eventId} /> : null}
          </div>
          <p className="mt-3 text-xs text-muted">
            {readiness.activeJudges} active judge{readiness.activeJudges === 1 ? "" : "s"} ·{" "}
            {readiness.teamsWithSubmission} submitted team
            {readiness.teamsWithSubmission === 1 ? "" : "s"}
          </p>
        </>
      ) : readiness.teamsWithSubmission > 0 && readiness.fullyJudgedTeams === readiness.teamsWithSubmission ? (
        <>
          <CardDescription>
            All {readiness.teamsWithSubmission} submitted team
            {readiness.teamsWithSubmission === 1 ? "" : "s"} fully judged. Winners can be
            announced. Announcing triggers the instant 50% payouts immediately.
          </CardDescription>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`/organizer/hackathons/${slug}/winners`}>
              <Button arrow>Announce Winners</Button>
            </Link>
            <Link href={`/organizer/hackathons/${slug}/judges`}>
              <Button variant="secondary" arrow>Judges &amp; Readiness</Button>
            </Link>
          </div>
        </>
      ) : (
        <>
          <CardDescription>
            Live standings from <strong>finalized</strong> reviews only: {readiness.fullyJudgedTeams}/
            {readiness.teamsWithSubmission} teams fully judged by all {readiness.activeJudges} active
            judge{readiness.activeJudges === 1 ? "" : "s"}.
          </CardDescription>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href={`/organizer/hackathons/${slug}/judges`}>
              <Button size="sm" variant="secondary" arrow>
                Judges &amp; Readiness
              </Button>
            </Link>
          </div>
          {results && results.results.length > 0 ? (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2">Rank</th>
                  <th className="pb-2">Team</th>
                  <th className="pb-2 text-right">Weighted score</th>
                  <th className="pb-2 text-right">Judges</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((result) => (
                  <tr key={result.teamId} className="border-t border-ink/5">
                    <td className="py-2 font-bold text-ink">{result.rank}</td>
                    <td className="py-2 font-semibold text-ink">{nameFor(result.teamId)}</td>
                    <td className="py-2 text-right font-display font-bold text-ink">
                      {result.weightedScore.toFixed(2)}
                    </td>
                    <td className="py-2 text-right">
                      <Badge variant="neutral">{result.judgeCount}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-3 text-sm text-muted">
              No finalized reviews yet. Standings appear as judges finalize.
            </p>
          )}
          <CardDescription>
            Winner announcement and the instant 50% payouts:{" "}
            <Link href={`/organizer/hackathons/${slug}/winners`} className="underline hover:text-ink">
              open the winners console
            </Link>
            .
          </CardDescription>
        </>
      )}
    </Card>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MilestoneConfirmer } from "@/components/payout/milestone-confirmer";
import { WinnersAnnouncer } from "@/components/payout/winners-announcer";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { STATUS_LABELS } from "@/lib/events/lifecycle";
import { computeEventResults } from "@/services/judging/results";
import { formatKes } from "@/lib/utils";

export const metadata: Metadata = { title: "Winners" };

export default async function EventWinnersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, user] = await Promise.all([params, requireUser()]);

  const event = await prisma.event.findFirst({
    where: { slug },
    include: {
      org: { include: { members: { where: { userId: user.id, status: "ACTIVE" } } } },
      prizes: { orderBy: { place: "asc" } },
      winners: {
        include: {
          user: { select: { handle: true, name: true } },
          team: { select: { name: true } },
          payouts: true,
          milestone: true,
        },
      },
      teams: {
        where: { status: { not: "DISBANDED" }, submission: { isNot: null } },
        include: {
          members: {
            where: { status: "JOINED" },
            include: { user: { select: { handle: true, profile: { select: { payoutRecipientCode: true } } } } },
          },
          leader: { select: { id: true, profile: { select: { payoutRecipientCode: true } } } },
        },
      },
    },
  });
  if (!event) notFound();
  const membership = event.org.members[0];
  if (!membership || membership.role === "MEMBER") notFound();

  const announced = event.winners.length > 0;
  const poolKes = event.prizes.reduce((sum, prize) => sum + prize.amountKes, 0);

  const results = event.status === "JUDGING" ? await computeEventResults(event.id) : null;
  const scoreFor = (teamId: string) => results?.results.find((r) => r.teamId === teamId) ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Winners</h1>
          <p className="mt-1 text-sm text-muted">
            {event.title} ·{" "}
            {announced
              ? "announced, payout status below"
              : event.status === "JUDGING"
                ? "select winners from the judged results"
                : STATUS_LABELS[event.status]}
          </p>
        </div>
        <Badge variant={announced ? "success" : "warning"}>
          {announced ? "Winners announced" : "Not yet announced"}
        </Badge>
      </header>

      {!announced && event.status === "JUDGING" ? (
        <WinnersAnnouncer
          eventId={event.id}
          poolKes={poolKes}
          prizes={event.prizes.map((prize) => ({
            place: prize.place,
            label: prize.label,
            amountKes: prize.amountKes,
            milestoneRequired: prize.milestoneRequired,
          }))}
          teams={event.teams.map((team) => {
            const scored = scoreFor(team.id);
            return {
              teamId: team.id,
              name: team.name,
              score: scored?.weightedScore ?? null,
              rank: scored?.rank ?? null,
              members: team.members.map((m) => `@${m.user.handle}`).join(" · "),
              leaderHasRecipient: Boolean(team.leader.profile?.payoutRecipientCode),
            };
          })}
        />
      ) : null}

      {announced ? (
        <>
          <Card>
            <CardTitle>Winners &amp; Payouts</CardTitle>
            <ul className="mt-4 space-y-4">
              {event.winners
                .slice()
                .sort((a, b) => a.place - b.place)
                .map((winner) => {
                  const instant = winner.payouts.find((p) => p.tranche === "INSTANT");
                  const milestone = winner.payouts.find((p) => p.tranche === "MILESTONE");
                  return (
                    <li key={winner.id} className="rounded-card border border-ink/10 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-ink">
                            {winner.place}
                            {["st", "nd", "rd"][winner.place - 1] ?? "th"} place:{" "}
                            {winner.team.name}
                          </p>
                          <p className="text-xs text-muted">
                            led by @{winner.user.handle} · paid to the leader, split per the
                            team&apos;s declared split
                          </p>
                        </div>
                        <p className="font-display text-xl font-bold text-ink">
                          {formatKes(winner.amountKes)}
                        </p>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-control bg-paper px-3 py-2 text-sm">
                          <span className="text-muted">50% on the day </span>
                          <strong className="text-ink">{formatKes(instant?.amountKes ?? 0)}</strong>{" "}
                          <Badge
                            variant={
                              instant?.status === "SUCCEEDED"
                                ? "success"
                                : instant?.status === "MANUAL_REVIEW" || instant?.status === "FAILED"
                                  ? "danger"
                                  : "warning"
                            }
                          >
                            {(instant?.status ?? "QUEUED").toLowerCase().replace("_", " ")}
                          </Badge>
                          {instant?.paidAt ? (
                            <span className="ml-2 text-xs text-muted">
                              {new Date(instant.paidAt).toLocaleDateString("en-KE", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          ) : null}
                        </div>
                        <div className="rounded-control bg-paper px-3 py-2 text-sm">
                          <span className="text-muted">50% on milestone </span>
                          <strong className="text-ink">
                            {formatKes(
                              milestone?.amountKes ??
                                (winner.milestoneRequired
                                  ? winner.amountKes - (instant?.amountKes ?? 0)
                                  : 0)
                            )}
                          </strong>{" "}
                          {winner.milestoneRequired ? (
                            <Badge
                              variant={
                                milestone?.status === "SUCCEEDED"
                                  ? "success"
                                  : milestone
                                    ? "warning"
                                    : "neutral"
                              }
                            >
                              {milestone?.status
                                ? milestone.status.toLowerCase().replace("_", " ")
                                : "awaiting handover"}
                            </Badge>
                          ) : (
                            <Badge variant="success">n/a, paid in full</Badge>
                          )}
                        </div>
                      </div>
                      {winner.milestone && !winner.milestone.confirmedAt ? (
                        <MilestoneConfirmer winnerId={winner.id} />
                      ) : null}
                    </li>
                  );
                })}
            </ul>
          </Card>
          <Card>
            <CardTitle>Milestone Dues</CardTitle>
            <CardDescription>
              The final 50% releases when you confirm each winner&apos;s handover. Confirming
              triggers the milestone payout immediately.
            </CardDescription>
          </Card>
        </>
      ) : null}

      {!announced && event.status !== "JUDGING" ? (
        <Card>
          <CardTitle>Winners Aren&apos;t Open Yet</CardTitle>
          <CardDescription>
            Announcement unlocks when judging opens and every submitted team has a finalized
            review. Current status: {STATUS_LABELS[event.status]}.
          </CardDescription>
        </Card>
      ) : null}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX2, Rocket } from "lucide-react";

import { LegacyCheckinCard } from "@/components/legacy/legacy-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireOnboardedUser();
  const firstName = (user.name ?? user.handle).split(" ")[0];

  // Active surfaces: pending team invites, in-flight payouts, due legacy check-ins.
  const [pendingInvites, dueCheckins] = await Promise.all([
    prisma.teamMember.count({
      where: { userId: user.id, status: "INVITED", team: { status: { not: "DISBANDED" } } },
    }),
    prisma.legacyCheckin.findMany({
      where: {
        completedAt: null,
        dueAt: { lt: new Date() },
        submission: {
          team: { members: { some: { userId: user.id, status: "JOINED" } } },
        },
      },
      include: {
        submission: {
          include: { team: { include: { event: { select: { title: true } } } } },
        },
      },
      take: 3,
    }),
  ]);

  const winningsInFlight = await prisma.payout.count({
    where: {
      winner: { userId: user.id },
      status: { in: ["QUEUED", "PROCESSING", "FAILED", "MANUAL_REVIEW"] },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Welcome back, {firstName}</h1>
          <p className="mt-1 text-sm text-muted">
            Your events, teams, and payouts — {pendingInvites > 0 ? `${pendingInvites} invite${pendingInvites === 1 ? "" : "s"} waiting · ` : ""}
            {winningsInFlight > 0 ? `${winningsInFlight} payout${winningsInFlight === 1 ? "" : "s"} in flight` : "all settled"}
          </p>
        </div>
        <Badge variant="brand">@{user.handle}</Badge>
      </div>

      {dueCheckins.length > 0 ? (
        <section className="space-y-4" aria-label="Legacy check-ins due">
          {dueCheckins.map((checkin) => (
            <LegacyCheckinCard
              key={checkin.id}
              submissionId={checkin.submissionId}
              eventTitle={checkin.submission.team.event.title}
              dueLabel={`Due since ${new Date(checkin.dueAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}.`}
            />
          ))}
        </section>
      ) : null}

      <EmptyState
        icon={CalendarX2}
        title={dueCheckins.length > 0 ? "" : "No active events right now"}
        description={
          dueCheckins.length > 0
            ? ""
            : "Prize Verified events appear here the moment you register — active events, teams, and in-flight payouts at a glance."
        }
        action={
          dueCheckins.length > 0 ? undefined : (
            <Link href="/events">
              <Button>Browse events</Button>
            </Link>
          )
        }
      />

      {dueCheckins.length === 0 ? (
        <Card>
          <CardTitle className="flex items-center gap-2">
            <Rocket aria-hidden className="size-5" /> The full loop is live
          </CardTitle>
          <CardDescription>
            Escrowed prize pools, 50/50 payouts, structured judge feedback, verified Proof-of-Work
            profiles, hiring intros, the 48-hour media standard, and 3-month legacy tracking — the
            platform runs end to end. Next: production hardening (runbooks, load tests, audit).
          </CardDescription>
        </Card>
      ) : null}
    </div>
  );
}

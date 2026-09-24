import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EndorseWinnersForm } from "@/components/pow/endorse-winners-form";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Endorse winners" };

export default async function JudgeEndorsePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, user] = await Promise.all([params, requireOnboardedUser()]);

  const event = await prisma.event.findFirst({
    where: { slug },
    include: {
      winners: {
        include: {
          user: { select: { id: true, name: true, handle: true } },
          team: { select: { name: true } },
        },
      },
    },
  });
  if (!event) notFound();

  const assignment = await prisma.judgeAssignment.findFirst({
    where: { eventId: event.id, userId: user.id, status: "ACTIVE" },
  });
  if (!assignment) notFound();

  const already = await prisma.endorsement.findMany({
    where: { judgeId: user.id, eventId: event.id },
    select: { developerId: true },
  });
  const endorsed = new Set(already.map((e) => e.developerId));

  const winners = event.winners
    .filter((winner) => !endorsed.has(winner.user.id))
    .map((winner) => ({
      userId: winner.user.id,
      name: winner.user.name ?? `@${winner.user.handle}`,
      handle: winner.user.handle,
      place: winner.place,
      teamName: winner.team.name,
    }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">Endorse winners</h1>
        <p className="mt-1 text-sm text-muted">{event.title}</p>
      </header>

      {event.winners.length === 0 ? (
        <Card>
          <CardTitle>No winners yet</CardTitle>
          <CardDescription>Endorsements unlock once winners are announced.</CardDescription>
        </Card>
      ) : winners.length === 0 ? (
        <Card>
          <CardTitle>All endorsements written</CardTitle>
          <CardDescription>
            You&apos;ve endorsed every winner of this event — they&apos;re live on their profiles.
          </CardDescription>
        </Card>
      ) : (
        <EndorseWinnersForm eventId={event.id} winners={winners} />
      )}
    </div>
  );
}

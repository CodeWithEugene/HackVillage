import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RequestIntroForm } from "@/components/pow/request-intro-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatKes } from "@/lib/utils";

export const metadata: Metadata = { title: "Request Introduction" };

export default async function RequestIntroPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const [{ handle }] = await Promise.all([params, requireOnboardedUser()]);

  const winner = await prisma.winner.findFirst({
    where: { user: { handle: { equals: handle, mode: "insensitive" } } },
    include: {
      user: { include: { profile: { select: { headline: true, skills: true } } } },
      event: { select: { id: true, title: true, slug: true } },
      payouts: { select: { tranche: true, status: true } },
    },
    orderBy: { announcedAt: "desc" },
  });
  if (!winner) notFound();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">
          {winner.user.name ?? `@${handle}`}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Verified winner: {formatKes(winner.amountKes)} ·{" "}
          {winner.event.title}
        </p>
        {winner.user.profile?.skills?.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {winner.user.profile.skills.slice(0, 8).map((skill) => (
              <Badge key={skill}>{skill}</Badge>
            ))}
          </div>
        ) : null}
      </header>

      <RequestIntroForm
        developerId={winner.user.id}
        eventId={winner.event.id}
        handle={handle}
      />

      <Card>
        <p className="text-sm text-muted">
          Introduction requests anchor to verified wins. The platform confirms the developer
          actually won and was actually paid before an intro can be requested.
        </p>
      </Card>
    </div>
  );
}

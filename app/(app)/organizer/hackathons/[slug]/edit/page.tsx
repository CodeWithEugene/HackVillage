import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EventWizard } from "@/components/events/event-wizard";
import { requireUser } from "@/lib/auth/guards";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Edit Hackathon" };

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, user] = await Promise.all([params, requireUser()]);

  const event = await prisma.event.findFirst({
    where: { slug, status: "DRAFT" },
    include: { prizes: { orderBy: { place: "asc" } }, org: { select: { id: true } } },
  });
  if (!event) notFound();

  const membership = await prisma.orgMember.findFirst({
    where: {
      orgId: event.org.id,
      userId: user.id,
      status: "ACTIVE",
      role: { in: ["OWNER", "ADMIN"] },
    },
  });
  if (!membership) notFound();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">Edit Draft Hackathon</h1>
        <p className="mt-1 text-sm text-muted">
          Drafts stay editable. Once published, the hackathon locks until the vault deposit flow
          arrives.
        </p>
      </header>
      <EventWizard
        minPoolKes={getEnv().MIN_PRIZE_POOL_KES}
        defaults={{
          eventId: event.id,
          title: event.title,
          summary: event.summary ?? "",
          venueType: event.venueType,
          location: event.location ?? "",
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          registrationDeadline: event.registrationDeadline,
          problemStatement: event.problemStatement ?? "",
          rules: event.rules ?? "",
          rolesWanted: event.rolesWanted,
          maxTeams: event.maxTeams,
          prizes: event.prizes.map((prize) => ({
            place: prize.place,
            label: prize.label,
            amountKes: prize.amountKes,
            milestoneRequired: prize.milestoneRequired,
          })),
        }}
      />
    </div>
  );
}

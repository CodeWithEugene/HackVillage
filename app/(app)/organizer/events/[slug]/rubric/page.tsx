import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RubricEditor } from "@/components/judging/rubric-editor";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import type { Criterion } from "@/lib/judging/compute";

export const metadata: Metadata = { title: "Rubric" };

export default async function EventRubricPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, user] = await Promise.all([params, requireUser()]);

  const event = await prisma.event.findFirst({
    where: { slug },
    include: {
      rubric: true,
      org: { include: { members: { where: { userId: user.id, status: "ACTIVE" } } } },
    },
  });
  if (!event) notFound();
  const membership = event.org.members[0];
  if (!membership || membership.role === "MEMBER") notFound();

  const locked =
    event.status === "JUDGING" ||
    event.status === "WINNERS_ANNOUNCED" ||
    event.status === "SETTLED";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">Rubric</h1>
        <p className="mt-1 text-sm text-muted">
          {event.title} · judges score 0-10 per criterion
        </p>
      </header>

      <RubricEditor
        eventId={event.id}
        initial={(event.rubric?.criteria as unknown as Criterion[]) ?? null}
        locked={locked}
      />
    </div>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EventWizard } from "@/components/events/event-wizard";
import { requireSurface } from "@/lib/auth/guards";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Create Event" };

export default async function NewEventPage() {
  const user = await requireSurface("organizer");

  const membership = await prisma.orgMember.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    select: { role: true },
  });
  if (!membership || membership.role === "MEMBER") {
    redirect("/organizer");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">Create An Event</h1>
        <p className="mt-1 text-sm text-muted">
          Five steps to a draft. Publishing declares the prize pool — the event goes live only
          after it&apos;s locked in the Prize Vault.
        </p>
      </header>
      <EventWizard minPoolKes={getEnv().MIN_PRIZE_POOL_KES} />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX2, Plus, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InviteCodeManager } from "@/components/organizer/invite-code-manager";
import { requireSurface } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Organize" };

export default async function OrganizerPage() {
  const user = await requireSurface("organizer");

  const membership = await prisma.orgMember.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    include: { org: true },
  });

  if (!membership) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="You need an organization"
        description="Organizations hold escrowed prize pools and run events. Create one to start organizing — it takes a minute."
        action={
          <Link href="/onboarding/organizer">
            <Button>Create organization</Button>
          </Link>
        }
      />
    );
  }

  const org = membership.org;
  const activeInvites = await prisma.orgInvitation.findMany({
    where: { orgId: org.id, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{org.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {membership.role.toLowerCase()} · hackvillage.app/organizers/{org.slug}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="success">Trust score {org.trustScore}</Badge>
          <Badge variant="warning">KYB: not started</Badge>
        </div>
      </div>

      <Card>
        <CardTitle className="flex items-center gap-2">
          <Plus aria-hidden className="size-5" /> Run your first event
        </CardTitle>
        <CardDescription>
          The event builder arrives in Phase 2 of the platform build — problem statements, prize
          breakdowns, and the escrowed Prize Vault that makes it Prize Verified.
        </CardDescription>
        <Button variant="secondary" disabled className="mt-4">
          Create event (coming soon)
        </Button>
      </Card>

      <EmptyState
        icon={CalendarX2}
        title="No events yet"
        description="When your events run, they'll show here with vault state, registrations, and judging — all in one command center."
      />

      <InviteCodeManager
        codes={activeInvites.map((invite) => ({
          token: invite.token,
          expiresAt: invite.expiresAt.toISOString(),
        }))}
      />
    </div>
  );
}

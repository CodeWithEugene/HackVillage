import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InviteCodeManager } from "@/components/organizer/invite-code-manager";
import { OrgProfileForm } from "@/components/organizer/org-profile-form";
import { requireSurface } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { canEditOrgProfile } from "@/lib/orgs/profile";
import { formatKes } from "@/lib/utils";

export const metadata: Metadata = { title: "Organize" };

const KYB_BADGE = {
  NONE: { label: "KYB: Not Started", tone: "warning" },
  PENDING: { label: "KYB: In Review", tone: "warning" },
  VERIFIED: { label: "Verified Organizer", tone: "success" },
  FAILED: { label: "KYB: Needs Attention", tone: "danger" },
} as const;

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
        description="Organizations hold escrowed prize pools and run hackathons. Create one to start organizing; it takes a minute."
        action={
          <Link href="/onboarding/organizer">
            <Button arrow>Create Organization</Button>
          </Link>
        }
      />
    );
  }

  const org = membership.org;
  const [activeInvites, orgEvents] = await Promise.all([
    prisma.orgInvitation.findMany({
      where: { orgId: org.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.event.findMany({
      where: { orgId: org.id },
      include: { prizes: { select: { amountKes: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const eventsWithPools = orgEvents.map((event) => ({
    ...event,
    poolKes: event.prizes.reduce((sum, prize) => sum + prize.amountKes, 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{org.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {membership.role.toLowerCase()} · hackvillage.xyz/organizers/{org.slug}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="success">Trust score {org.trustScore}</Badge>
          <Badge variant={KYB_BADGE[org.kycStatus].tone}>{KYB_BADGE[org.kycStatus].label}</Badge>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plus aria-hidden className="size-5" /> Run A Hackathon
            </CardTitle>
            <CardDescription>
              Five steps to a draft; publishing declares the prize pool. The vault deposit flow
              (Phase 3) flips it live with the Prize Verified badge.
            </CardDescription>
          </div>
          <Link href="/organizer/hackathons/new">
            <Button arrow>Create Hackathon</Button>
          </Link>
        </div>
      </Card>

      {eventsWithPools.length > 0 ? (
        <Card>
          <CardTitle>Hackathons</CardTitle>
          <ul className="mt-3 divide-y divide-ink/5">
            {eventsWithPools.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="text-sm font-semibold text-ink">{event.title}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-muted">{formatKes(event.poolKes)} pool</span>
                  <Badge variant={event.status === "DRAFT" ? "neutral" : event.status === "PENDING_DEPOSIT" ? "warning" : "success"}>
                    {event.status === "PENDING_DEPOSIT" ? "pending deposit" : event.status.toLowerCase()}
                  </Badge>
                  <Link href={`/organizer/hackathons/${event.slug}`}>
                    <Button size="sm" variant="secondary" arrow>Manage</Button>
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Public Profile</CardTitle>
        <CardDescription>
          Hackathon pages show this in the Organizer card, next to your trust score and track
          record.
          {org.kycStatus === "VERIFIED"
            ? " Your name is locked because KYB verified it; contact HackVillage to change it."
            : null}
        </CardDescription>
        <div className="mt-4">
          {canEditOrgProfile(membership.role) ? (
            <OrgProfileForm
              org={{ id: org.id, name: org.name, about: org.about }}
              mode="organizer"
              nameEditable={org.kycStatus !== "VERIFIED"}
            />
          ) : (
            <p className="text-sm leading-6 whitespace-pre-line text-body-copy">
              {org.about ?? "No about text yet. Ask an owner or admin to add one."}
            </p>
          )}
        </div>
      </Card>

      <InviteCodeManager
        codes={activeInvites.map((invite) => ({
          token: invite.token,
          expiresAt: invite.expiresAt.toISOString(),
        }))}
      />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Users } from "lucide-react";
import type { TrustEventType } from "@prisma/client";

import { InviteCodeManager } from "@/components/organizer/invite-code-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSurface } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Organization Settings" };

const KYB_BADGE = {
  NONE: { label: "KYB: Not Started", tone: "warning" },
  PENDING: { label: "KYB: In Review", tone: "warning" },
  VERIFIED: { label: "Verified Organization", tone: "success" },
  FAILED: { label: "KYB: Needs Attention", tone: "danger" },
} as const;

const TRUST_EVENT_LABELS: Record<TrustEventType, string> = {
  MEDIA_PENALTY: "Media delivered late",
  PAYOUT_EXCELLENCE: "Payout excellence",
  MANUAL_ADJUST: "Trust adjustment",
  APPEAL_GRANTED: "Appeal granted",
};

const ROLE_ORDER = { OWNER: 0, ADMIN: 1, MEMBER: 2 } as const;

const dateFormat = new Intl.DateTimeFormat("en-KE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Nairobi",
});

export default async function OrganizationSettingsPage() {
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
  const [members, activeInvites, trustEvents] = await Promise.all([
    prisma.orgMember.findMany({
      where: { orgId: org.id, status: "ACTIVE" },
      include: { user: { select: { name: true, email: true, handle: true } } },
    }),
    prisma.orgInvitation.findMany({
      where: { orgId: org.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.trustEvent.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const sortedMembers = [...members].sort(
    (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role],
  );
  const kyb = KYB_BADGE[org.kycStatus];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{org.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Organization settings · public page at{" "}
            <Link href={`/organizers/${org.slug}`} className="font-semibold text-ink underline">
              /organizers/{org.slug}
            </Link>
          </p>
        </div>
        <Badge variant="success">Trust score {org.trustScore}</Badge>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck aria-hidden className="size-5" /> Business Verification
            </CardTitle>
            <CardDescription>
              {org.kycStatus === "VERIFIED"
                ? "Your organization is verified. Your hackathons carry the Verified Organization badge."
                : "Verification is required before your first prize-pool deposit. Review takes up to 48 hours."}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={kyb.tone}>{kyb.label}</Badge>
            <Link href="/organizer/verification">
              <Button variant="secondary" size="sm" arrow>
                {org.kycStatus === "VERIFIED" ? "View" : "Continue"}
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle className="flex items-center gap-2">
          <Users aria-hidden className="size-5" /> Members
        </CardTitle>
        <CardDescription>
          Everyone with organizer access to {org.name}. Owners and admins can manage hackathons,
          invites and this page.
        </CardDescription>
        <ul className="mt-4 divide-y divide-ink/5">
          {sortedMembers.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {member.user.name ?? member.user.email}
                  {member.userId === user.id ? (
                    <span className="ml-1 font-normal text-muted">(you)</span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted">{member.user.email}</p>
              </div>
              <Badge variant={member.role === "MEMBER" ? "neutral" : "brand"}>
                {member.role.toLowerCase()}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>

      <InviteCodeManager
        codes={activeInvites.map((invite) => ({
          token: invite.token,
          expiresAt: invite.expiresAt.toISOString(),
        }))}
      />

      <Card>
        <CardTitle>Trust History</CardTitle>
        <CardDescription>
          Why the score is where it is. Penalties and awards land here the moment they are
          recorded; the same history (minus internal notes) is public on your organizer page.
        </CardDescription>
        {trustEvents.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No trust events yet. The score moves with payout speed, media delivery and milestone
            honesty.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-ink/5">
            {trustEvents.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {TRUST_EVENT_LABELS[event.type]}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {dateFormat.format(event.createdAt)}
                    {event.reason ? ` · ${event.reason}` : ""}
                  </p>
                </div>
                <Badge variant={event.delta < 0 ? "danger" : "success"}>
                  {event.delta > 0 ? `+${event.delta}` : event.delta} points
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

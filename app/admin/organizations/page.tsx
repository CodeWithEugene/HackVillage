import type { Metadata } from "next";

import { OrgProfileForm } from "@/components/organizer/org-profile-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Admin · Organizations" };

const KYB_TONE = {
  NONE: "neutral",
  PENDING: "warning",
  VERIFIED: "success",
  FAILED: "danger",
} as const;

export default async function AdminOrganizationsPage() {
  const orgs = await prisma.organization.findMany({
    include: {
      members: {
        where: { role: "OWNER", status: "ACTIVE" },
        take: 1,
        include: { user: { select: { email: true } } },
      },
      _count: { select: { events: true } },
    },
    orderBy: [{ about: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-ink">Organizations</h1>
      <p className="max-w-2xl text-sm text-muted">
        Fill in or correct an organizer&apos;s public profile. Organizers can edit their own
        about text; once KYB verifies them, only HackVillage can change the name. Every edit here
        needs a reason and is written to the audit log. Profiles with no about text are listed
        first.
      </p>

      <ul className="space-y-3">
        {orgs.map((org) => (
          <li key={org.id}>
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{org.name}</p>
                  <p className="text-xs text-muted">
                    {org._count.events} hackathon{org._count.events === 1 ? "" : "s"}
                    {org.members[0] ? ` · owner ${org.members[0].user.email}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {org.about ? null : <Badge variant="warning">No About Text</Badge>}
                  <Badge variant={KYB_TONE[org.kycStatus]}>KYB {org.kycStatus.toLowerCase()}</Badge>
                  <Badge variant="neutral">Trust {org.trustScore}</Badge>
                </div>
              </div>
              <OrgProfileForm org={org} mode="admin" nameEditable />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

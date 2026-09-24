import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { KybDecisionForm } from "@/components/admin/kyb-decision-form";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Admin · KYB" };

export default async function AdminKybPage() {
  const orgs = await prisma.organization.findMany({
    where: { kycStatus: { in: ["PENDING", "FAILED"] } },
    include: { members: { where: { role: "OWNER", status: "ACTIVE" }, take: 1, include: { user: { select: { email: true } } } } },
    orderBy: [{ kycStatus: "desc" }, { updatedAt: "desc" }],
  });

  const verified = await prisma.organization.count({ where: { kycStatus: "VERIFIED" } });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold text-ink">KYB review queue</h1>
        <Badge variant="success">{verified} verified</Badge>
      </div>
      <p className="max-w-2xl text-sm text-muted">
        Business verification gates the first deposit of every organization (CBK compliance via the
        licensed PSP). Manual review now; Paystack-automated at go-live. Every decision is written
        to the append-only audit log.
      </p>

      {orgs.length === 0 ? (
        <Card>
          <CardTitle>Queue is clear</CardTitle>
          <p className="mt-2 text-sm text-muted">No organizations are waiting for review.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {orgs.map((org) => (
            <li key={org.id}>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{org.name}</p>
                    <p className="text-xs text-muted">
                      hackvillage.app/organizers/{org.slug}
                      {org.members[0] ? ` · owner ${org.members[0].user.email}` : ""}
                    </p>
                  </div>
                  <Badge variant={org.kycStatus === "PENDING" ? "warning" : "danger"}>
                    {org.kycStatus.toLowerCase()}
                  </Badge>
                </div>
                <KybDecisionForm orgId={org.id} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

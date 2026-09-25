import type { Metadata } from "next";

import { TrustAdjustForm } from "@/components/admin/trust-adjust-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Admin · Trust" };

export default async function AdminTrustPage() {
  const orgs = await prisma.organization.findMany({
    include: {
      trustEvents: { orderBy: { createdAt: "desc" }, take: 10 },
      _count: { select: { events: true } },
    },
    orderBy: { trustScore: "asc" },
    take: 50,
  });

  const penaltyByOrg = new Map<string, string>();
  for (const org of orgs) {
    const penalty = org.trustEvents.find((event) => event.type === "MEDIA_PENALTY");
    if (penalty) penaltyByOrg.set(org.id, penalty.reason);
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-ink">Trust Ledger</h1>
      <p className="max-w-2xl text-sm text-muted">
        Every score change has a TrustEvent behind it: media penalties, appeals, and manual
        adjustments (all audit-logged). Manual adjustments cap at ±50.
      </p>

      <Card>
        <CardTitle>Organizations ({orgs.length})</CardTitle>
        <ul className="mt-4 space-y-5">
          {orgs.map((org) => (
            <li key={org.id} className="rounded-card border border-ink/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{org.name}</p>
                  <p className="text-xs text-muted">
                    {org._count.events} event{org._count.events === 1 ? "" : "s"} · score floor 0, cap 150
                  </p>
                </div>
                <Badge variant={org.trustScore >= 90 ? "success" : org.trustScore >= 60 ? "warning" : "danger"}>
                  Trust {org.trustScore}
                </Badge>
              </div>

              {org.trustEvents.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {org.trustEvents.map((trustEvent) => (
                    <li key={trustEvent.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-muted">
                        {trustEvent.createdAt.toLocaleDateString("en-KE", { day: "numeric", month: "short" })} ·{" "}
                        {trustEvent.reason.slice(0, 90)}
                        {trustEvent.reason.length > 90 ? "…" : ""}
                      </span>
                      <span
                        className={`font-mono text-xs font-bold ${
                          trustEvent.delta >= 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {trustEvent.delta >= 0 ? "+" : ""}
                        {trustEvent.delta}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted">No trust events yet.</p>
              )}

              {penaltyByOrg.get(org.id) ? (
                <div className="mt-3 rounded-control border border-warning/30 bg-warning/10 p-3">
                  <p className="text-xs font-semibold text-ink">Pending media penalty (appealable):</p>
                  <p className="text-xs text-muted">{penaltyByOrg.get(org.id)}</p>
                </div>
              ) : null}

              <TrustAdjustForm
                orgId={org.id}
                hasPenalty={penaltyByOrg.has(org.id)}
                originalReason={penaltyByOrg.get(org.id) ?? ""}
              />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

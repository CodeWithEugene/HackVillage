import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { PayoutOpsActions } from "@/components/admin/payout-ops-actions";
import { prisma } from "@/lib/db";
import { formatKes } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin · Payments" };

const STATUS_TONES: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  SUCCEEDED: "success",
  QUEUED: "warning",
  PROCESSING: "warning",
  FAILED: "danger",
  REVERSED: "danger",
  MANUAL_REVIEW: "danger",
};

export default async function AdminPaymentsPage() {
  const [payouts, kpi] = await Promise.all([
    prisma.payout.findMany({
      where: { status: { in: ["FAILED", "REVERSED", "MANUAL_REVIEW", "PROCESSING", "QUEUED"] } },
      include: {
        winner: {
          include: {
            user: { select: { handle: true, name: true } },
            event: { select: { title: true, slug: true } },
          },
        },
      },
      orderBy: [{ status: "asc" }, { queuedAt: "asc" }],
      take: 100,
    }),
    computeTrustKpi(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">Payment operations</h1>
        <Badge variant={kpi.trustScore >= 0.9 ? "success" : "warning"}>
          Trust KPI: {(kpi.trustScore * 100).toFixed(0)}% in 1h ({kpi.withinWindow}/{kpi.total})
        </Badge>
      </div>

      <Card>
        <CardTitle>Open Payout Queue ({payouts.length})</CardTitle>
        <p className="mt-2 text-sm text-muted">
          Failed payouts retry automatically with backoff until the attempt cap, then land here.
          Funds stay locked the whole time — nothing is ever lost. &ldquo;Mark paid&rdquo; requires
          the payment receipt and writes an audit entry.
        </p>
        {payouts.length === 0 ? (
          <p className="mt-4 rounded-control border border-dashed border-ink/15 bg-paper p-6 text-center text-sm text-muted">
            Queue is clear — every payout is settled.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {payouts.map((payout) => (
              <li key={payout.id} className="rounded-card border border-ink/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {payout.winner.event.title} · {payout.winner.place}
                      {["st", "nd", "rd"][payout.winner.place - 1] ?? "th"} place ·{" "}
                      <span className="font-normal text-muted">
                        @{payout.winner.user.handle}
                      </span>
                    </p>
                    <p className="text-xs text-muted">
                      {payout.tranche === "INSTANT" ? "instant 50%" : "milestone 50%"} ·{" "}
                      {payout.attemptCount} attempt{payout.attemptCount === 1 ? "" : "s"}
                      {payout.lastError ? ` · ${payout.lastError.slice(0, 80)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-lg font-bold text-ink">
                      {formatKes(payout.amountKes)}
                    </span>
                    <Badge variant={STATUS_TONES[payout.status] ?? "neutral"}>
                      {payout.status.toLowerCase().replace("_", " ")}
                    </Badge>
                  </div>
                </div>
                <PayoutOpsActions payoutId={payout.id} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

async function computeTrustKpi() {
  const payouts = await prisma.payout.findMany({
    where: { tranche: "INSTANT" },
    select: {
      paidAt: true,
      queuedAt: true,
      winner: { select: { announcedAt: true } },
    },
  });
  const total = payouts.length;
  if (total === 0) return { withinWindow: 0, total: 0, trustScore: 1 };
  const withinWindow = payouts.filter(
    (p) =>
      p.paidAt != null &&
      p.paidAt.getTime() - p.winner.announcedAt.getTime() <= 3_600_000
  ).length;
  return { withinWindow, total, trustScore: withinWindow / total };
}

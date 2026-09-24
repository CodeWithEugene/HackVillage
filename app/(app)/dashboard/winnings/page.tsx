import type { Metadata } from "next";
import Link from "next/link";
import { HandCoins } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { DisputeForm } from "@/components/legacy/legacy-cards";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatKes } from "@/lib/utils";

export const metadata: Metadata = { title: "Winnings" };

const STATUS_TONES: Record<string, "success" | "warning" | "danger" | "neutral" | "brand"> = {
  SUCCEEDED: "success",
  QUEUED: "warning",
  PROCESSING: "brand",
  FAILED: "danger",
  REVERSED: "danger",
  MANUAL_REVIEW: "danger",
};

const STATUS_LABELS: Record<string, string> = {
  SUCCEEDED: "Paid",
  QUEUED: "Queued",
  PROCESSING: "Processing",
  FAILED: "Retrying",
  REVERSED: "Reversed",
  MANUAL_REVIEW: "Under review",
};

export default async function WinningsPage() {
  const user = await requireOnboardedUser();

  const [wins, profile] = await Promise.all([
    prisma.winner
      .findMany({
        where: { userId: user.id },
        include: {
          event: { select: { title: true, slug: true, org: { select: { name: true } } } },
          payouts: true,
        },
        orderBy: { announcedAt: "desc" },
      })
      .then((rows) =>
        rows.map((row) => ({
          ...row,
          payouts: [...row.payouts].sort((a, b) => a.tranche.localeCompare(b.tranche)),
        }))
      ),
    prisma.developerProfile.findUnique({
      where: { userId: user.id },
      select: { payoutRecipientCode: true, payoutMethod: true },
    }),
  ]);

  const totalPaid = wins
    .flatMap((win) => win.payouts)
    .filter((p) => p.status === "SUCCEEDED")
    .reduce((sum, p) => sum + p.amountKes, 0);
  const pendingTotal = wins
    .flatMap((win) => win.payouts)
    .filter((p) => p.status !== "SUCCEEDED")
    .reduce((sum, p) => sum + p.amountKes, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Winnings</h1>
          <p className="mt-1 text-sm text-muted">
            Every prize, every tranche — 50% on the day, 50% on milestones.
          </p>
        </div>
        <div className="flex gap-3 text-right">
          <div>
            <p className="text-xs font-semibold uppercase text-muted">Paid out</p>
            <p className="font-display text-xl font-bold text-success">{formatKes(totalPaid)}</p>
          </div>
          {pendingTotal > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase text-muted">In flight</p>
              <p className="font-display text-xl font-bold text-ink">{formatKes(pendingTotal)}</p>
            </div>
          ) : null}
        </div>
      </header>

      {!profile?.payoutRecipientCode ? (
        <Card className="border-warning/40">
          <CardTitle className="text-base">Add a payout method</CardTitle>
          <CardDescription>
            You have no M-Pesa or bank destination on file — winnings can&apos;t flow until you do.
            It takes a minute.
          </CardDescription>
          <Link href="/settings" className="mt-3 inline-block">
            <Badge variant="brand">Set up payouts in Settings →</Badge>
          </Link>
        </Card>
      ) : null}

      {wins.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="No winnings yet"
          description="When you win a Prize Verified event, the 50% instant tranche lands here the same day — tracked to the shilling."
          action={
            <Link href="/events">
              <Badge variant="brand">Find an event</Badge>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-4">
          {wins.map((win) => (
            <li key={win.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold text-ink">
                      {win.event.title} — {win.place}
                      {["st", "nd", "rd"][win.place - 1] ?? "th"} place
                    </p>
                    <p className="text-xs text-muted">
                      {win.event.org.name} · announced{" "}
                      {new Date(win.announcedAt).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <p className="font-display text-2xl font-bold text-ink">{formatKes(win.amountKes)}</p>
                </div>

                <ul className="mt-4 space-y-2">
                  {win.payouts.map((payout) => (
                    <li
                      key={payout.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-ink/10 bg-paper px-3 py-2 text-sm"
                    >
                      <span className="font-semibold text-ink">
                        {payout.tranche === "INSTANT"
                          ? "50% on the day"
                          : "50% on milestone"}
                      </span>
                      <span className="font-display font-bold text-ink">
                        {formatKes(payout.amountKes)}
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge variant={STATUS_TONES[payout.status] ?? "neutral"}>
                          {STATUS_LABELS[payout.status] ?? payout.status.toLowerCase()}
                        </Badge>
                        {payout.paidAt ? (
                          <span className="text-xs text-muted">
                            {new Date(payout.paidAt).toLocaleDateString("en-KE", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Dispute entry when milestone is stuck + 14 days past announcement */}
                {win.milestoneRequired &&
                !win.payouts.some((p) => p.tranche === "MILESTONE") &&
                Date.now() - win.announcedAt.getTime() > 14 * 24 * 60 * 60 * 1000 ? (
                  <div className="mt-3">
                    <DisputeForm winnerId={win.id} />
                  </div>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

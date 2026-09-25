import type { Metadata } from "next";

import { DisputeResolutionForm } from "@/components/admin/dispute-resolution-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { formatKes } from "@/lib/utils";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Admin · Disputes" };

export default async function AdminDisputesPage() {
  const disputes = await prisma.dispute.findMany({
    include: {
      winner: {
        include: {
          user: { select: { name: true, handle: true } },
          event: { select: { title: true } },
          milestone: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const open = disputes.filter((dispute) => dispute.status === "OPEN");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink">Milestone Disputes</h1>
        <Badge variant={open.length > 0 ? "warning" : "success"}>
          {open.length} open · {disputes.length} total
        </Badge>
      </div>
      <p className="max-w-2xl text-sm text-muted">
        Winners can dispute unconfirmed milestones after 14 days. Release queues the final 50%
        through the normal payout path (idempotent); reject leaves the organizer&apos;s confirmation
        standing. Every resolution is audit-logged.
      </p>

      {disputes.length === 0 ? (
        <Card>
          <CardTitle>No Disputes</CardTitle>
          <p className="mt-2 text-sm text-muted">
            The queue is clear. No milestones are being disputed.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {disputes.map((dispute) => (
            <li key={dispute.id}>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">
                      {dispute.winner.user.name ?? `@${dispute.winner.user.handle}`}{" "}
                      <span className="font-normal text-muted">
                        vs {dispute.winner.event.title} organizers
                      </span>
                    </p>
                    <p className="text-xs text-muted">
                      {formatKes(dispute.winner.amountKes)} prize · opened{" "}
                      {new Date(dispute.createdAt).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "short",
                      })}
                      {dispute.evidenceUrl ? " · evidence attached" : ""}
                    </p>
                  </div>
                  <Badge
                    variant={
                      dispute.status === "OPEN"
                        ? "warning"
                        : dispute.status === "RESOLVED_RELEASE"
                          ? "success"
                          : "danger"
                    }
                  >
                    {dispute.status.toLowerCase().replace(/_/g, " ")}
                  </Badge>
                </div>

                <blockquote className="mt-3 border-l-4 border-ink/15 pl-4 text-sm leading-6 text-ink-soft">
                  {dispute.claim}
                  {dispute.evidenceUrl ? (
                    <a
                      href={dispute.evidenceUrl}
                      className="ml-2 underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      evidence ↗
                    </a>
                  ) : null}
                </blockquote>

                {dispute.status === "OPEN" ? (
                  <DisputeResolutionForm disputeId={dispute.id} />
                ) : dispute.resolutionNote ? (
                  <p className="mt-3 rounded-control bg-paper p-3 text-xs text-muted">
                    Resolution: {dispute.resolutionNote}
                  </p>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

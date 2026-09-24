import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Handshake } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Intro Requests" };

export default async function HiringRequestsPage() {
  const user = await requireOnboardedUser();
  if (!user.roles.includes("HIRING")) notFound();

  const requests = await prisma.introduction.findMany({
    where: { hiringPartnerId: user.id },
    include: {
      developer: { select: { name: true, handle: true } },
      event: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">Your intro requests</h1>
        <p className="mt-1 text-sm text-muted">
          Accepted introductions include contact details.
        </p>
      </header>

      {requests.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="No requests yet"
          description="Browse the talent directory and request an introduction from any verified winner's profile."
        />
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => (
            <li key={request.id}>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">
                      {request.developer.name ?? `@${request.developer.handle}`}{" "}
                      <span className="font-normal text-muted">@{request.developer.handle}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {request.event.title} · requested{" "}
                      {new Date(request.createdAt).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <Badge
                    variant={
                      request.status === "ACCEPTED"
                        ? "success"
                        : request.status === "DECLINED"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {request.status.toLowerCase()}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{request.message}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

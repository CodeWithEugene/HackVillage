import type { Metadata } from "next";
import { Handshake } from "lucide-react";

import { IntroResponseActions } from "@/components/pow/intro-response-actions";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Introductions" };

export default async function DeveloperIntrosPage() {
  const user = await requireOnboardedUser();

  const intros = await prisma.introduction.findMany({
    where: { developerId: user.id },
    include: {
      hiringPartner: { select: { name: true, handle: true, email: true, profile: { select: { headline: true } } } },
      event: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">Introductions</h1>
        <p className="mt-1 text-sm text-muted">
          Hiring partners who saw your verified wins. Accepting exchanges contact details.
        </p>
      </header>

      {intros.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="No introductions yet"
          description="When a hiring partner requests an intro after seeing your verified record, it lands here."
        />
      ) : (
        <ul className="space-y-3">
          {intros.map((intro) => (
            <li key={intro.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">
                      {intro.hiringPartner.profile?.headline ?? "A hiring partner"}
                    </p>
                    <p className="text-xs text-muted">
                      re: your win at {intro.event.title} ·{" "}
                      {new Date(intro.createdAt).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  {intro.status === "ACCEPTED" ? (
                    <p className="rounded-control bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
                      Contact: {intro.hiringPartner.email}
                    </p>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{intro.message}</p>
                {intro.status === "REQUESTED" ? (
                  <IntroResponseActions introductionId={intro.id} />
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

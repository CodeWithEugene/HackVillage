import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Users } from "lucide-react";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatKes } from "@/lib/utils";

export const metadata: Metadata = { title: "Talent Directory" };

export default async function HiringPage() {
  const user = await requireOnboardedUser();
  const isPartner = user.roles.includes("HIRING");

  const winners = await prisma.winner.findMany({
    include: {
      user: {
        include: {
          profile: { select: { headline: true, skills: true, location: true } },
          _count: { select: { endorsementsReceived: true } },
        },
      },
      event: { select: { title: true, slug: true, org: { select: { name: true } } } },
    },
    orderBy: { announcedAt: "desc" },
    take: 50,
  });

  // Distinct winners by developer (latest win first).
  const seen = new Set<string>();
  const talent = winners.filter((winner) => {
    if (seen.has(winner.user.id)) return false;
    seen.add(winner.user.id);
    return true;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Verified Talent</h1>
          <p className="mt-1 text-sm text-muted">
            Every profile here is backed by a platform-verified win, a real payout, and judge
            feedback.
          </p>
        </div>
      </header>

      {!isPartner ? (
        <Card className="border-brand">
          <CardTitle className="flex items-center gap-2">
            <Briefcase aria-hidden className="size-5" /> Hiring Here?
          </CardTitle>
          <CardDescription>
            Join as a hiring partner to request verified introductions. It&apos;s free — you pay
            nothing, developers pay nothing; we&apos;re paid by event organizers.
          </CardDescription>
          <Link href="/hiring/join" className="mt-4 inline-block">
            <span className="inline-flex h-11 items-center rounded-control bg-brand px-5 font-semibold text-ink">
              Become a hiring partner
            </span>
          </Link>
        </Card>
      ) : (
        <Card>
          <CardTitle>Partner Mode Active</CardTitle>
          <CardDescription>
            Request introductions from any verified winner&apos;s profile — track them in{" "}
            <Link href="/hiring/requests" className="underline hover:text-ink">
              your requests
            </Link>
            .
          </CardDescription>
        </Card>
      )}

      {talent.length === 0 ? (
        <EmptyState
          icon={Users}
          title="The directory fills as events conclude"
          description="Every winner of a Prize Verified event lands here automatically — verified win, verified payout, judge endorsement."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {talent.map((winner) => (
            <Card key={winner.id} className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/developers/${winner.user.handle}`}
                    className="font-display text-lg font-bold text-ink hover:underline"
                  >
                    {winner.user.name ?? `@${winner.user.handle}`}
                  </Link>
                  <p className="text-xs text-muted">
                    @{winner.user.handle} · {winner.user.profile?.location ?? "Kenya"}
                  </p>
                </div>
                <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-ink">
                  {winner.place}
                  {["st", "nd", "rd"][winner.place - 1] ?? "th"} place
                </span>
              </div>

              {winner.user.profile?.headline ? (
                <p className="mt-2 text-sm leading-6 text-muted">
                  {winner.user.profile.headline}
                </p>
              ) : null}

              <p className="mt-3 text-xs text-muted">
                Won{" "}
                <Link href={`/events/${winner.event.slug}`} className="underline">
                  {winner.event.title}
                </Link>{" "}
                · {winner.event.org.name} · {formatKes(winner.amountKes)} verified
              </p>

              {winner.user._count.endorsementsReceived > 0 ? (
                <p className="mt-1 text-xs font-semibold text-ink">
                  {winner.user._count.endorsementsReceived} judge endorsement
                  {winner.user._count.endorsementsReceived === 1 ? "" : "s"}
                </p>
              ) : null}

              <div className="mt-auto pt-4">
                <Link
                  href={`/developers/${winner.user.handle}`}
                  className="text-sm font-semibold text-ink underline"
                >
                  View verified profile →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

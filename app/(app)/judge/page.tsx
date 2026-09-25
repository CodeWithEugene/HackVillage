import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import Link from "next/link";
import { Gavel } from "lucide-react";

export const metadata: Metadata = { title: "Judging" };

export default async function JudgeHomePage() {
  const user = await requireOnboardedUser();

  const assignments = await prisma.judgeAssignment.findMany({
    where: { userId: user.id, status: { in: ["INVITED", "ACTIVE"] } },
    include: {
      event: {
        select: {
          slug: true,
          title: true,
          status: true,
          startsAt: true,
          endsAt: true,
          org: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">Judging</h1>
        <p className="mt-1 text-sm text-muted">
          Your assigned hackathons. Structured feedback (one strength, one improvement, one next step)
          unlocks every finalization.
        </p>
      </header>

      {assignments.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="No judging assignments yet"
          description="When an organizer invites you to judge a hackathon, it lands here with the rubric and team queue."
        />
      ) : (
        <ul className="space-y-3">
          {assignments.map((assignment) => (
            <li key={assignment.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        assignment.status === "ACTIVE"
                          ? assignment.event.status === "JUDGING"
                            ? "brand"
                            : "neutral"
                          : "warning"
                      }
                    >
                      {assignment.status === "ACTIVE"
                        ? assignment.event.status === "JUDGING"
                          ? "judging open"
                          : "active"
                        : "invited"}
                    </Badge>
                    <span className="text-xs text-muted">{assignment.event.org.name}</span>
                  </div>
                  <p className="mt-1.5 font-display text-lg font-bold text-ink">
                    {assignment.event.title}
                  </p>
                  <p className="text-xs text-muted">
                    ends{" "}
                    {new Date(assignment.event.endsAt).toLocaleDateString("en-KE", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                {assignment.status === "INVITED" ? (
                  <div className="flex gap-2">
                    <form action={`/api/judge/invites/${assignment.id}`} method="post">
                      <input type="hidden" name="decision" value="accept" />
                      <Button type="submit" size="sm">
                        Accept
                      </Button>
                    </form>
                    <form action={`/api/judge/invites/${assignment.id}`} method="post">
                      <input type="hidden" name="decision" value="decline" />
                      <Button type="submit" size="sm" variant="secondary">
                        Decline
                      </Button>
                    </form>
                  </div>
                ) : (
                  <Link href={`/judge/hackathons/${assignment.event.slug}`}>
                    <Button size="sm" arrow>Open Team Queue</Button>
                  </Link>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

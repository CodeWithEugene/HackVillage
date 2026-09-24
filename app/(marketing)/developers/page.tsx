import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Developers",
  description: "Browse verified Proof-of-Work developer profiles on HackVillage.",
};

export default async function DevelopersPage() {
  const developers = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      handle: true,
      name: true,
      profile: {
        select: { headline: true, skills: true, location: true, visible: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 48,
  });

  const visible = developers.filter((developer) => developer.profile && developer.profile.visible);

  return (
    <div className="site-container py-16">
      <header className="mb-10 text-center">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          Proof-of-Work Profiles
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Every metric on these profiles is verified by platform events — wins, contributions, judge
          endorsements. No self-reported stats, ever.
        </p>
      </header>

      {visible.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Profiles land here as the community grows"
          description="The first developers are joining now. Once events run, this page fills with verified win rates and endorsed portfolios."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((developer) => (
            <Link key={developer.handle} href={`/developers/${developer.handle}`}>
              <Card className="h-full transition-shadow hover:shadow-lg">
                <p className="font-display text-lg font-bold text-ink">
                  {developer.name ?? `@${developer.handle}`}
                </p>
                <p className="text-sm font-medium text-ink-soft">@{developer.handle}</p>
                {developer.profile?.headline ? (
                  <p className="mt-2 text-sm leading-6 text-muted">{developer.profile.headline}</p>
                ) : null}
                {developer.profile?.skills?.length ? (
                  <p className="mt-3 font-mono text-xs text-muted">
                    {developer.profile.skills.slice(0, 4).join(" · ")}
                  </p>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

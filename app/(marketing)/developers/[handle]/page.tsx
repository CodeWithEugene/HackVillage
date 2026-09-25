import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { currentUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { computePowMetrics } from "@/services/pow/service";
import { formatKes } from "@/lib/utils";

interface ProfilePageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `@${handle}`,
    description: `The verified Proof-of-Work profile for @${handle} on HackVillage.`,
  };
}

export default async function DeveloperProfilePage({ params }: ProfilePageProps) {
  const { handle } = await params;
  const [user, viewer] = await Promise.all([
    prisma.user.findFirst({
      where: { handle: { equals: handle, mode: "insensitive" }, deletedAt: null },
      select: {
        id: true,
        name: true,
        handle: true,
        createdAt: true,
        profile: {
          select: {
            headline: true,
            bio: true,
            location: true,
            skills: true,
            githubLogin: true,
            linkedinUrl: true,
          },
        },
      },
    }),
    currentUser(),
  ]);
  const viewerIsHiring = Boolean(viewer?.roles.includes("HIRING"));

  if (!user?.profile) notFound();

  const profile = user.profile;

  const [metrics, endorsements, portfolio] = await Promise.all([
    computePowMetrics(user.id),
    prisma.endorsement.findMany({
      where: { developerId: user.id, visibility: "PUBLISHED" },
      include: {
        judge: { select: { name: true, handle: true } },
        event: { select: { title: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.portfolioItem.findMany({
      where: { developerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">
              {user.name ?? `@${user.handle}`}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted">
              @{user.handle}
              <span aria-hidden>·</span>
              joined {user.createdAt.toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
            </p>
          </div>
          <Badge variant="brand">
            <BadgeCheck aria-hidden className="size-3.5" /> Proof-of-Work verified
          </Badge>
        </div>

        {profile.headline ? (
          <p className="mt-4 text-lg font-medium text-ink-soft">{profile.headline}</p>
        ) : null}

        {profile.location ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
            <MapPin aria-hidden className="size-4" /> {profile.location}
          </p>
        ) : null}

        {profile.bio ? <p className="mt-4 leading-7 text-muted">{profile.bio}</p> : null}

        {profile.skills?.length ? (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => (
              <Badge key={skill}>{skill}</Badge>
            ))}
          </div>
        ) : null}

        {profile.githubLogin || profile.linkedinUrl ? (
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            {profile.githubLogin ? (
              <a
                href={`https://github.com/${profile.githubLogin}`}
                className="font-semibold text-ink underline hover:no-underline"
                rel="me noreferrer"
                target="_blank"
              >
                GitHub · {profile.githubLogin}
              </a>
            ) : null}
            {profile.linkedinUrl ? (
              <a
                href={profile.linkedinUrl}
                className="font-semibold text-ink underline hover:no-underline"
                rel="me noreferrer"
                target="_blank"
              >
                LinkedIn
              </a>
            ) : null}
          </div>
        ) : null}
      </Card>

      {/* Verified record — platform-derived numbers only (§6.6) */}
      <div className="mt-6 grid gap-4 sm:grid-cols-5">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Hackathons</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{metrics.eventsParticipated}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Wins</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{metrics.wins}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Win rate</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">
            {metrics.winRate != null ? `${metrics.winRate}%` : "N/A"}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Earned</p>
          <p className="mt-1 font-display text-lg font-bold text-ink">{formatKes(metrics.totalWonKes)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Endorsed</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{metrics.endorsementCount}</p>
        </Card>
      </div>

      {portfolio.length > 0 ? (
        <Card className="mt-6">
          <CardTitle>Portfolio</CardTitle>
          <ul className="mt-3 space-y-3">
            {portfolio.map((item) => (
              <li key={item.id} className="rounded-card border border-ink/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{item.title}</p>
                  <Badge
                    variant={
                      item.lifecycle === "IN_PRODUCTION"
                        ? "success"
                        : item.lifecycle === "PIVOTED"
                          ? "brand"
                          : "neutral"
                    }
                  >
                    {item.lifecycle === "IN_PRODUCTION"
                      ? "in production"
                      : item.lifecycle === "PIVOTED"
                        ? "pivoted"
                        : item.lifecycle === "ARCHIVED"
                          ? "archived"
                          : "demo"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted">{item.summary}</p>
                <a
                  href={item.repoUrl}
                  className="mt-2 inline-block text-sm font-semibold text-ink underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Repository ↗
                </a>
                {item.demoUrl ? (
                  <>
                    {" · "}
                    <a
                      href={item.demoUrl}
                      className="inline-block text-sm font-semibold text-ink underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Demo ↗
                    </a>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {endorsements.length > 0 ? (
        <Card className="mt-6">
          <CardTitle>Judge Endorsements</CardTitle>
          <ul className="mt-3 space-y-4">
            {endorsements.map((endorsement) => (
              <li key={endorsement.id} className="border-l-4 border-brand pl-4">
                <p className="leading-7 text-ink-soft">&ldquo;{endorsement.quote}&rdquo;</p>
                <p className="mt-1 text-xs text-muted">
                  {endorsement.judge.name ?? `@${endorsement.judge.handle}`}, judge,{" "}
                  <a href={`/hackathons/${endorsement.event.slug}`} className="underline">
                    {endorsement.event.title}
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardTitle>Hiring?</CardTitle>
        <CardDescription>
          Every metric above is derived from platform-verified activity: wins, payouts, and judge
          endorsements, never self-reported.{" "}
          {viewerIsHiring ? (
            <>
              Request a verified introduction on the{" "}
              <a href={`/hiring/request/${user.handle}`} className="font-semibold underline hover:text-ink">
                intro page
              </a>
              .
            </>
          ) : (
            <>
              Hiring partners can request a verified introduction from the{" "}
              <a href="/hiring" className="underline hover:text-ink">
                talent directory
              </a>
              .
            </>
          )}
        </CardDescription>
      </Card>
    </div>
  );
}

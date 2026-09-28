import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { JsonLd } from "@/components/seo/json-ld";
import { currentUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { profileSchema } from "@/lib/seo/schema";
import { computePowMetrics } from "@/services/pow/service";
import { formatKes } from "@/lib/utils";
import { isIndexableDeveloper } from "@/lib/seo/indexable";
import { pageOpenGraph } from "@/lib/seo/metadata";

interface ProfilePageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { handle } = await params;
  const user = await prisma.user.findFirst({
    where: { handle: { equals: handle, mode: "insensitive" }, deletedAt: null },
    select: {
      name: true,
      handle: true,
      email: true,
      profile: { select: { headline: true, location: true } },
      _count: { select: { registrations: true, portfolioItems: true } },
    },
  });
  if (!user?.profile) return { title: "Profile Not Found", robots: { index: false } };
  const indexable = isIndexableDeveloper({
    email: user.email,
    registrationCount: user._count.registrations,
    portfolioCount: user._count.portfolioItems,
  });
  const detail = [user.profile.headline, user.profile.location].filter(Boolean).join(", ");
  return {
    title: `${user.name ?? `@${user.handle}`} (@${user.handle}), Verified Hackathon Developer`,
    description: `The verified Proof-of-Work profile for @${user.handle}${detail ? ` (${detail})` : ""}: hackathon results, judge endorsements and projects on HackVillage.`,
    // Demo, test and empty profiles stay reachable but out of search results.
    robots: indexable ? undefined : { index: false, follow: true },
    alternates: { canonical: `/developers/${user.handle}` },
    openGraph: pageOpenGraph(`/developers/${user.handle}`),
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
    <>
      <JsonLd
        data={profileSchema({
          handle: user.handle,
          name: user.name,
          headline: profile.headline,
          bio: profile.bio,
          location: profile.location,
          githubLogin: profile.githubLogin,
          linkedinUrl: profile.linkedinUrl,
        })}
      />
      <div className="lp">
        <section className="hk-hero" aria-labelledby="profile-name">
          <div className="lp-frame hk-hero-frame">
            <div className="hk-hero-bar">
              <span className="hk-hero-kicker">
                @{user.handle} · joined{" "}
                {user.createdAt.toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
              </span>
              <Badge variant="brand">
                <BadgeCheck aria-hidden className="size-3.5" /> Proof-of-Work verified
              </Badge>
            </div>
            <div className="pg-hero-grid pf-hero-grid">
              <div>
                <h1 id="profile-name" className="pg-title">
                  {user.name ?? `@${user.handle}`}
                </h1>
                {profile.headline ? <p className="pg-lead">{profile.headline}</p> : null}
                {profile.location ? (
                  <p className="pf-location">
                    <MapPin aria-hidden className="size-4" /> {profile.location}
                  </p>
                ) : null}
                {profile.bio ? <p className="pf-bio">{profile.bio}</p> : null}
                {profile.skills?.length ? (
                  <ul className="hk-tags pf-skills" aria-label="Skills">
                    {profile.skills.map((skill) => (
                      <li key={skill}>{skill}</li>
                    ))}
                  </ul>
                ) : null}
                {profile.githubLogin || profile.linkedinUrl ? (
                  <div className="pf-links">
                    {profile.githubLogin ? (
                      <a
                        href={`https://github.com/${profile.githubLogin}`}
                        rel="me noreferrer"
                        target="_blank"
                      >
                        GitHub · {profile.githubLogin}
                      </a>
                    ) : null}
                    {profile.linkedinUrl ? (
                      <a href={profile.linkedinUrl} rel="me noreferrer" target="_blank">
                        LinkedIn
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Verified record — platform-derived numbers only (§6.6) */}
              <dl className="pf-stats">
                <div>
                  <dt>Hackathons</dt>
                  <dd>{metrics.eventsParticipated}</dd>
                </div>
                <div>
                  <dt>Wins</dt>
                  <dd>{metrics.wins}</dd>
                </div>
                <div>
                  <dt>Win rate</dt>
                  <dd>{metrics.winRate != null ? `${metrics.winRate}%` : "N/A"}</dd>
                </div>
                <div>
                  <dt>Earned</dt>
                  <dd>{formatKes(metrics.totalWonKes)}</dd>
                </div>
                <div>
                  <dt>Endorsed</dt>
                  <dd>{metrics.endorsementCount}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {portfolio.length > 0 ? (
          <section className="lp-section" aria-labelledby="portfolio-heading">
            <div className="lp-frame lp-block lp-divided">
              <h2 id="portfolio-heading" className="lp-statement lp-statement-sm">
                Portfolio
              </h2>
              <ul className="pf-portfolio">
                {portfolio.map((item) => (
                  <li key={item.id} className="pf-item">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="pf-item-title">{item.title}</p>
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
                    <p className="pf-item-summary">{item.summary}</p>
                    <p className="pf-item-links">
                      <a href={item.repoUrl} target="_blank" rel="noreferrer">
                        Repository ↗
                      </a>
                      {item.demoUrl ? (
                        <>
                          {" · "}
                          <a href={item.demoUrl} target="_blank" rel="noreferrer">
                            Demo ↗
                          </a>
                        </>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {endorsements.length > 0 ? (
          <section className="lp-section" aria-labelledby="endorsements-heading">
            <div className="lp-frame lp-block lp-divided">
              <h2 id="endorsements-heading" className="lp-statement lp-statement-sm">
                Judge Endorsements
              </h2>
              <ul className="pf-endorsements">
                {endorsements.map((endorsement) => (
                  <li key={endorsement.id}>
                    <blockquote>&ldquo;{endorsement.quote}&rdquo;</blockquote>
                    <p>
                      {endorsement.judge.name ?? `@${endorsement.judge.handle}`}, judge,{" "}
                      <a href={`/hackathons/${endorsement.event.slug}`}>
                        {endorsement.event.title}
                      </a>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        <section className="lp-section" aria-labelledby="hiring-heading">
          <div className="lp-frame lp-block lp-divided lp-split">
            <h2 id="hiring-heading" className="lp-split-heading">
              Hiring?
            </h2>
            <p className="lp-split-text pf-hiring">
              Every metric above is derived from platform-verified activity: wins, payouts, and
              judge endorsements, never self-reported.{" "}
              {viewerIsHiring ? (
                <>
                  Request a verified introduction on the{" "}
                  <a href={`/hiring/request/${user.handle}`}>intro page</a>.
                </>
              ) : (
                <>
                  Hiring partners can request a verified introduction from the{" "}
                  <a href="/hiring">talent directory</a>.
                </>
              )}
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

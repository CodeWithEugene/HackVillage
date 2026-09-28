import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ExternalLink, MapPin, ShieldCheck, Timer } from "lucide-react";
import type { TrustEventType } from "@prisma/client";

import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { formatEventDates } from "@/lib/events/format";
import { isPublicHackathon } from "@/lib/events/visibility";
import { formatOrgLocation, isOrgKind, ORG_KIND_LABELS } from "@/lib/orgs/details";
import { pageOpenGraph } from "@/lib/seo/metadata";
import { appUrl } from "@/lib/url";
import { formatKes } from "@/lib/utils";

import { summarizeMediaTimeliness, summarizePayoutPerformance } from "./performance";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Public-safe organization select. contactPhone is deliberately absent — it
 * is for the HackVillage team only (schema comment) and must never reach a
 * public page.
 */
const PUBLIC_ORG_SELECT = {
  id: true,
  name: true,
  slug: true,
  about: true,
  kind: true,
  city: true,
  country: true,
  website: true,
  socialUrl: true,
  kycStatus: true,
  trustScore: true,
  createdAt: true,
} as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { name: true, about: true, kycStatus: true },
  });
  if (!org) return { title: "Organizer Not Found", robots: { index: false } };
  const verified = org.kycStatus === "VERIFIED";
  return {
    title: `${org.name}, ${verified ? "Verified " : ""}Hackathon Organizer`,
    description:
      org.about ??
      `${org.name} hosts hackathons on HackVillage with 100% escrowed prize pools and payouts recorded on a public ledger.`,
    alternates: { canonical: `/organizers/${slug}` },
    openGraph: pageOpenGraph(`/organizers/${slug}`),
  };
}

const joinedFormat = new Intl.DateTimeFormat("en-KE", {
  month: "short",
  year: "numeric",
  timeZone: "Africa/Nairobi",
});

const dateFormat = new Intl.DateTimeFormat("en-KE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Nairobi",
});

const TRUST_EVENT_LABELS: Record<TrustEventType, string> = {
  MEDIA_PENALTY: "Media delivered late",
  PAYOUT_EXCELLENCE: "Payout excellence",
  MANUAL_ADJUST: "Trust adjustment",
  APPEAL_GRANTED: "Appeal granted",
};

/** "technetium.co.ke" from "https://www.technetium.co.ke/" (same rule as the Organizer card). */
function linkLabel(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    const host = hostname.replace(/^www\./, "");
    return pathname.length > 1 ? `${host}${pathname.replace(/\/$/, "")}` : host;
  } catch {
    return url;
  }
}

function formatMedianMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} h`;
}

export default async function OrganizerTrustPage({ params }: PageProps) {
  const { slug } = await params;
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: PUBLIC_ORG_SELECT,
  });
  if (!org) notFound();

  const [events, trustEvents, payouts, media, escrowed] = await Promise.all([
    prisma.event.findMany({
      where: { orgId: org.id, publishedAt: { not: null } },
      select: {
        slug: true,
        title: true,
        status: true,
        startsAt: true,
        endsAt: true,
        publishedAt: true,
        prizeVerifiedAt: true,
        prizes: { select: { amountKes: true } },
      },
      orderBy: { startsAt: "desc" },
      take: 12,
    }),
    prisma.trustEvent.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.payout.findMany({
      where: { winner: { event: { orgId: org.id } } },
      select: {
        tranche: true,
        status: true,
        paidAt: true,
        winner: { select: { announcedAt: true } },
      },
    }),
    prisma.mediaAsset.findMany({
      where: { event: { orgId: org.id }, status: { not: "HIDDEN" } },
      select: {
        eventId: true,
        uploadedAt: true,
        event: { select: { mediaDeadlineAt: true } },
      },
    }),
    prisma.prizeBreakdown.aggregate({
      _sum: { amountKes: true },
      where: { event: { orgId: org.id, prizeVerifiedAt: { not: null } } },
    }),
  ]);

  const performance = summarizePayoutPerformance(
    payouts.map((payout) => ({
      tranche: payout.tranche,
      status: payout.status,
      paidAt: payout.paidAt,
      announcedAt: payout.winner.announcedAt,
    })),
  );
  const timeliness = summarizeMediaTimeliness(
    media.map((asset) => ({
      eventId: asset.eventId,
      uploadedAt: asset.uploadedAt,
      mediaDeadlineAt: asset.event.mediaDeadlineAt,
    })),
  );

  const location = formatOrgLocation(org);
  const facts = [isOrgKind(org.kind) ? ORG_KIND_LABELS[org.kind] : null, location].filter(Boolean);
  const links = [org.website, org.socialUrl].filter((link): link is string => Boolean(link));
  const verified = org.kycStatus === "VERIFIED";

  const stats = [
    { label: "Hackathons hosted", value: String(events.length) },
    { label: "Prizes escrowed", value: formatKes(escrowed._sum.amountKes ?? 0) },
    { label: "On HackVillage since", value: joinedFormat.format(org.createdAt) },
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: org.name,
          url: appUrl(`/organizers/${org.slug}`),
          ...(org.about ? { description: org.about.slice(0, 300) } : {}),
          ...(links.length > 0 ? { sameAs: links } : {}),
          ...(location
            ? {
                address: {
                  "@type": "PostalAddress",
                  ...(org.city ? { addressLocality: org.city } : {}),
                  addressCountry: org.country ?? "KE",
                },
              }
            : {}),
        }}
      />
      <div className="lp">
        <section className="hk-hero" aria-labelledby="org-name">
          <div className="lp-frame hk-hero-frame">
            <div className="pg-hero-grid pf-hero-grid">
              <div>
                <h1 id="org-name" className="pg-title">
                  {org.name}
                </h1>
                {facts.length > 0 ? (
                  <p className="pf-location">
                    {location ? <MapPin aria-hidden className="size-3.5 shrink-0" /> : null}
                    {facts.join(" · ")}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {verified ? (
                    <Badge variant="brand">
                      <ShieldCheck aria-hidden className="size-3.5" /> Verified Organization
                    </Badge>
                  ) : null}
                  <Badge variant="success">Trust score {org.trustScore}</Badge>
                </div>
                {org.about ? <p className="pf-bio whitespace-pre-line">{org.about}</p> : null}
                {links.length > 0 ? (
                  <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {links.map((link) => (
                      <li key={link} className="min-w-0">
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex max-w-full items-center gap-1 font-semibold text-ink-soft hover:text-ink"
                        >
                          <span className="truncate">{linkLabel(link)}</span>
                          <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <dl className="pf-stats">
                {stats.map((stat) => (
                  <div key={stat.label} className="min-w-0">
                    <dt>{stat.label}</dt>
                    <dd>{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section aria-labelledby="payout-performance" className="lp-section">
          <div className="lp-frame lp-block lp-divided">
            <h2 id="payout-performance" className="lp-statement lp-statement-sm">
              Payout Performance
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Card className="shadow-none">
                <CardTitle className="text-base">Instant Payouts</CardTitle>
                {performance.instantTotal === 0 ? (
                  <CardDescription>
                    No payouts yet. The first winners paid will start this record.
                  </CardDescription>
                ) : (
                  <>
                    <p className="mt-2 font-display text-2xl font-bold text-ink">
                      {performance.instantSucceeded} of {performance.instantTotal}
                    </p>
                    <CardDescription>
                      instant-tranche payouts confirmed. Winners are promised 50% of their prize
                      within an hour of results.
                    </CardDescription>
                  </>
                )}
              </Card>
              <Card className="shadow-none">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Timer aria-hidden className="size-4" /> Announce→Paid
                </CardTitle>
                {performance.medianInstantMinutes === null ? (
                  <CardDescription>
                    No confirmed instant payouts yet, so there is no median time to report.
                  </CardDescription>
                ) : (
                  <>
                    <p className="mt-2 font-display text-2xl font-bold text-ink">
                      {formatMedianMinutes(performance.medianInstantMinutes)}
                    </p>
                    <CardDescription>
                      median time from winners announced to the instant payout landing.
                    </CardDescription>
                  </>
                )}
              </Card>
              <Card className="shadow-none">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays aria-hidden className="size-4" /> Media Delivery
                </CardTitle>
                {timeliness.eventsWithMedia === 0 ? (
                  <CardDescription>
                    No event media yet. Event photos delivered within 48 hours start this record.
                  </CardDescription>
                ) : (
                  <>
                    <p className="mt-2 font-display text-2xl font-bold text-ink">
                      {timeliness.onTime} of {timeliness.eventsWithMedia}
                    </p>
                    <CardDescription>
                      events delivered media inside the 48-hour standard.
                    </CardDescription>
                  </>
                )}
              </Card>
            </div>
          </div>
        </section>

        <section aria-labelledby="hosted-events" className="lp-section">
          <div className="lp-frame lp-block lp-divided">
            <h2 id="hosted-events" className="lp-statement lp-statement-sm">
              Hackathons
            </h2>
            {events.length === 0 ? (
              <Card className="mt-6 shadow-none">
                <CardDescription>
                  {org.name} has not published a hackathon yet. When they do, it appears here with
                  its escrow status.
                </CardDescription>
              </Card>
            ) : (
              <ul className="mt-6 space-y-3">
                {events.map((event) => {
                  const isPublic = isPublicHackathon(event);
                  const poolKes = event.prizes.reduce((sum, prize) => sum + prize.amountKes, 0);
                  return (
                    <li key={event.slug}>
                      <Card className="shadow-none">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            {isPublic ? (
                              <Link
                                href={`/hackathons/${event.slug}`}
                                className="font-display text-lg font-bold text-ink hover:underline"
                              >
                                {event.title}
                              </Link>
                            ) : (
                              <p className="font-display text-lg font-bold text-ink">
                                {event.title}
                              </p>
                            )}
                            <p className="mt-1 text-sm text-muted">
                              {formatEventDates(event.startsAt, event.endsAt)} ·{" "}
                              {formatKes(poolKes)} prize pool
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {event.prizeVerifiedAt ? (
                              <Badge variant="success">
                                <ShieldCheck aria-hidden className="size-3.5" /> Prize Verified
                              </Badge>
                            ) : (
                              <Badge variant="neutral">{event.status.toLowerCase()}</Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section aria-labelledby="trust-history" className="lp-section">
          <div className="lp-frame lp-block lp-divided">
            <h2 id="trust-history" className="lp-statement lp-statement-sm">
              Trust History
            </h2>
            <Card className="mt-6 shadow-none">
              {trustEvents.length === 0 ? (
                <CardDescription>
                  No trust events yet. The score moves with payout speed, media delivery and
                  milestone honesty; a quiet history is a good history.
                </CardDescription>
              ) : (
                <ul className="divide-y divide-ink/5">
                  {trustEvents.map((event) => (
                    <li
                      key={event.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {TRUST_EVENT_LABELS[event.type]}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {dateFormat.format(event.createdAt)}
                          {event.type !== "MANUAL_ADJUST" && event.reason
                            ? ` · ${event.reason}`
                            : ""}
                        </p>
                      </div>
                      <Badge variant={event.delta < 0 ? "danger" : "success"}>
                        {event.delta > 0 ? `+${event.delta}` : event.delta} points
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <p className="mt-3 text-xs text-muted">
              Trust scores start at 100 and move with payout speed, media delivery and milestone
              honesty. Every lock and payout by this organizer is on the{" "}
              <Link href="/trust" className="font-semibold text-ink underline">
                public ledger
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import {
  DetailRail,
  DetailSection,
  EscrowCallout,
  KeyDates,
  PrizeTable,
  RegistrationAction,
} from "@/components/hackathons/detail-parts";
import { HackathonCard } from "@/components/hackathons/hackathon-card";
import { LandingLink } from "@/components/landing/landing-link";
import { OrganizerCard } from "@/components/patterns/organizer-card";
import { PrizeVerifiedBadge } from "@/components/patterns/prize-verified-badge";
import { StatusTimeline } from "@/components/patterns/status-timeline";
import { JsonLd } from "@/components/seo/json-ld";
import { currentUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { categoryLabel, isCategory } from "@/lib/events/categories";
import { coverFor } from "@/lib/events/covers";
import { formatEventDates, hackathonPhase } from "@/lib/events/format";
import { isPrizeVerified, registrationOpen } from "@/lib/events/lifecycle";
import { relativeDay, venueLabel, type ListingCard } from "@/lib/events/listing";
import { getListingCards } from "@/lib/events/listing-data";
import { PUBLIC_HACKATHON_WHERE } from "@/lib/events/visibility";
import { breadcrumbSchema, eventSchema } from "@/lib/seo/schema";
import { formatKes } from "@/lib/utils";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ registration?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await prisma.event.findFirst({
    where: { slug, ...PUBLIC_HACKATHON_WHERE },
    select: {
      title: true,
      summary: true,
      startsAt: true,
      endsAt: true,
      venueType: true,
      location: true,
      isDemo: true,
      prizes: { select: { amountKes: true } },
    },
  });
  if (!event) return { title: "Hackathon Not Found", robots: { index: false } };
  // Demo hackathons are fictional: visitors can browse them, but search
  // engines must not index them as real events.
  const robots = event.isDemo ? { index: false, follow: true } : undefined;
  const poolKes = event.prizes.reduce((sum, prize) => sum + prize.amountKes, 0);
  const venue = event.venueType === "ONLINE" ? "Online" : (event.location ?? "Kenya");
  // Long-tail description: dates + venue + pool mirror what people search for
  // ("hackathons in Nairobi September 2026", "KES prize hackathon").
  const description = `${event.summary ?? event.title} ${formatEventDates(event.startsAt, event.endsAt)} · ${venue} · ${formatKes(poolKes)} prize pool, 100% escrowed and Prize Verified on HackVillage.`;
  return {
    title: event.title,
    description,
    robots,
    alternates: { canonical: `/hackathons/${slug}` },
    openGraph: {
      title: event.title,
      description,
      type: "website",
      url: `/hackathons/${slug}`,
    },
  };
}

/** Other hackathons to look at next: live and upcoming first, soonest first. */
function moreHackathons(cards: ListingCard[], slug: string, now: Date): ListingCard[] {
  const others = cards.filter((card) => card.slug !== slug);
  const current = others
    .filter((card) => hackathonPhase(card, now) !== "past")
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = others.filter((card) => hackathonPhase(card, now) === "past");
  return [...current, ...past].slice(0, 3);
}

export default async function EventDetailPage({ params, searchParams }: PageProps) {
  const [{ slug }, { registration }, viewer] = await Promise.all([
    params,
    searchParams,
    currentUser(),
  ]);

  const event = await prisma.event.findFirst({
    // Unfunded hackathons are not on the public platform (lib/events/visibility).
    where: { slug, ...PUBLIC_HACKATHON_WHERE },
    include: {
      org: {
        select: {
          name: true,
          slug: true,
          trustScore: true,
          about: true,
          kycStatus: true,
          createdAt: true,
          // Public details only: contactPhone stays private.
          kind: true,
          city: true,
          country: true,
          website: true,
          socialUrl: true,
        },
      },
      prizes: { orderBy: { place: "asc" } },
      winners: {
        include: {
          user: { select: { handle: true, name: true } },
          team: { select: { name: true } },
          payouts: { select: { tranche: true, status: true } },
        },
      },
      _count: { select: { teams: { where: { status: { not: "DISBANDED" } } } } },
      media: {
        where: { status: "APPROVED" },
        orderBy: { uploadedAt: "desc" },
        take: 9,
      },
    },
  });
  if (!event) notFound();

  const now = new Date();
  const poolKes = event.prizes.reduce((sum, prize) => sum + prize.amountKes, 0);
  const open = registrationOpen(event, now);
  const verified = isPrizeVerified(event.status, event.prizeVerifiedAt);
  const categories = event.categories.filter(isCategory);
  const cover = coverFor(event);
  const gallery = event.media;
  const teams = event._count.teams;

  const [registration_, listing] = await Promise.all([
    viewer
      ? prisma.registration.findUnique({
          where: { eventId_userId: { eventId: event.id, userId: viewer.id } },
        })
      : null,
    getListingCards(),
  ]);
  const isRegistered = registration_?.status === "REGISTERED";
  const more = moreHackathons(listing, event.slug, now);

  const prizes = event.prizes.map((prize) => {
    const winner = event.winners.find((w) => w.place === prize.place);
    return {
      id: prize.id,
      label: prize.label,
      amountKes: prize.amountKes,
      milestoneRequired: prize.milestoneRequired,
      winner: winner ? { team: winner.team.name, handle: winner.user.handle } : null,
      firstHalfPaid: Boolean(
        winner?.payouts.some((p) => p.tranche === "INSTANT" && p.status === "SUCCEEDED"),
      ),
    };
  });

  const action = (
    <RegistrationAction
      slug={event.slug}
      open={open}
      signedIn={Boolean(viewer)}
      registered={isRegistered}
    />
  );

  return (
    <div className="lp">
      {/* Event + breadcrumb structured data: makes the hackathon eligible for
          Google event listings and quotable by AI answer engines. Demo
          hackathons get none: Event markup must describe real events. */}
      <JsonLd
        data={[
          ...(event.isDemo
            ? []
            : [
                eventSchema({
                  slug: event.slug,
                  title: event.title,
                  summary: event.summary,
                  startsAt: event.startsAt,
                  endsAt: event.endsAt,
                  venueType: event.venueType,
                  location: event.location,
                  coverUrl: cover,
                  orgName: event.org.name,
                  orgWebsite: event.org.website,
                  registrationDeadline: event.registrationDeadline,
                }),
              ]),
          breadcrumbSchema([
            { name: "Hackathons", path: "/hackathons" },
            { name: event.title, path: `/hackathons/${event.slug}` },
          ]),
        ]}
      />

      <section className="hk-hero hkd-hero" aria-labelledby="hkd-title">
        <div className="lp-frame hk-hero-frame">
          <div className="hk-hero-bar">
            <nav aria-label="Breadcrumb" className="hkd-crumbs">
              <Link href="/hackathons">Hackathons</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{event.title}</span>
            </nav>
            <Link href="/hackathons#directory" className="hkd-all">
              All hackathons <ChevronRight aria-hidden className="size-3.5" />
            </Link>
          </div>

          {/* Status banner — P1: money state is one glance away */}
          {registration === "closed" ? (
            <p className="hkd-banner" role="status">
              Registration for this hackathon has closed.
            </p>
          ) : null}

          <div className="hkd-hero-grid">
            <div>
              <h1 id="hkd-title" className="hkd-title">
                {event.title}
              </h1>
              {event.summary ? <p className="hkd-summary">{event.summary}</p> : null}
              {categories.length > 0 ? (
                <ul className="hkd-tracks" aria-label="Categories">
                  {categories.map((key) => (
                    <li key={key}>
                      <Link href={`/hackathons?category=${key}#directory`}>
                        {categoryLabel(key)}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="hkd-card">
              <div className="hkd-card-cover">
                <Image
                  src={cover}
                  alt={`${event.title} hackathon cover`}
                  fill
                  priority
                  sizes="(min-width: 1024px) 380px, 100vw"
                  unoptimized={!cover.startsWith("/")}
                  className="object-cover"
                />
                {verified ? <PrizeVerifiedBadge className="absolute top-3 right-3" /> : null}
              </div>
              <dl className="hkd-card-facts">
                <div>
                  <dt>Hosted by</dt>
                  <dd>{event.org.name}</dd>
                </div>
                <div>
                  <dt>Trust score</dt>
                  <dd>{event.org.trustScore}</dd>
                </div>
                <div>
                  <dt>Format</dt>
                  <dd className="capitalize">{event.venueType.toLowerCase()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      <div className="lp-frame lp-divided hkd-body">
        <DetailRail
          stats={[
            { label: "Prize pool", value: formatKes(poolKes) },
            { label: "Dates", value: formatEventDates(event.startsAt, event.endsAt) },
            { label: "Where", value: venueLabel(event) },
            { label: "Teams", value: `${teams} of ${event.maxTeams} places taken` },
            {
              label: "Registration",
              value: open ? `Closes ${relativeDay(event.registrationDeadline, now)}` : "Closed",
            },
          ]}
          action={action}
        />

        <div className="hkd-content">
          <DetailSection id="hkd-status" title="Where it stands">
            <div className="hkd-status">
              <StatusTimeline status={event.status} />
            </div>
          </DetailSection>

          <DetailSection id="hkd-brief" title="The challenge">
            <p className="hkd-prose">{event.problemStatement}</p>
            {event.rolesWanted.length > 0 ? (
              <>
                <h3 className="hkd-subtitle">Roles wanted</h3>
                <ul className="hk-tags">
                  {event.rolesWanted.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {event.rules ? (
              <>
                <h3 className="hkd-subtitle">Rules</h3>
                <p className="hkd-prose hkd-prose-sm">{event.rules}</p>
              </>
            ) : null}
          </DetailSection>

          <EscrowCallout poolKes={poolKes} verified={verified} />

          <DetailSection id="hkd-prizes" title="Prizes">
            <PrizeTable prizes={prizes} />
            <p className="hkd-muted hkd-small">
              Winners receive 50% instantly on the day; the rest releases on verified milestone
              completion.
            </p>
          </DetailSection>

          <DetailSection id="hkd-dates" title="Key dates">
            <KeyDates event={event} />
          </DetailSection>

          <DetailSection id="hkd-organizer" title="The organizer">
            <OrganizerCard org={{ id: event.orgId, ...event.org }} />
          </DetailSection>

          {/* Public gallery — 48-hour media vault */}
          {gallery.length > 0 ? (
            <DetailSection id="hkd-gallery" title="Hackathon gallery">
              <ul className="hkd-gallery">
                {gallery.map((asset) => (
                  <li key={asset.id}>
                    {asset.kind === "PHOTO" ? (
                      // eslint-disable-next-line @next/next/no-img-element -- media vault assets from dynamic storage
                      <img src={asset.url} alt={asset.caption ?? "Hackathon photo"} />
                    ) : (
                      <video src={asset.url} controls />
                    )}
                  </li>
                ))}
              </ul>
              <p className="hkd-muted hkd-small">
                Delivered within the 48-hour standard: high-resolution, community-first.
              </p>
            </DetailSection>
          ) : null}
        </div>
      </div>

      {more.length > 0 ? (
        <section className="lp-section" aria-labelledby="hkd-more">
          <div className="lp-frame lp-block lp-divided">
            <div className="hkd-more-head">
              <h2 id="hkd-more" className="lp-statement lp-statement-sm">
                More hackathons. <span>Every one Prize Verified before it went live.</span>
              </h2>
              <LandingLink href="/hackathons#directory" variant="secondary">
                Browse All
              </LandingLink>
            </div>
            <div className="hk-grid hkd-more-grid">
              {more.map((card) => (
                <HackathonCard key={card.slug} event={card} now={now} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";

import { PrizeVerifiedBadge } from "@/components/patterns/prize-verified-badge";
import { KeyDatesCard } from "@/components/patterns/key-dates-card";
import { StatusTimeline } from "@/components/patterns/status-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { currentUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import {
  isPrizeVerified,
  registrationOpen,
  STATUS_LABELS,
  statusTone,
} from "@/lib/events/lifecycle";
import { formatKes } from "@/lib/utils";
import Link from "next/link";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ registration?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { title: true, summary: true },
  });
  if (!event) return { title: "Hackathon Not Found" };
  return { title: event.title, description: event.summary ?? event.title };
}

const dateFormat = new Intl.DateTimeFormat("en-KE", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("en-KE", { hour: "numeric", minute: "2-digit" });

export default async function EventDetailPage({ params, searchParams }: PageProps) {
  const [{ slug }, { registration }, viewer] = await Promise.all([
    params,
    searchParams,
    currentUser(),
  ]);

  const event = await prisma.event.findFirst({
    where: { slug, publishedAt: { not: null } },
    include: {
      org: { select: { name: true, slug: true, trustScore: true, about: true } },
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

  const poolKes = event.prizes.reduce((sum, prize) => sum + prize.amountKes, 0);
  const verified = isPrizeVerified(event.status, event.prizeVerifiedAt);
  const open = registrationOpen(event);
  const gallery = event.media;

  const registration_ = viewer
    ? await prisma.registration.findUnique({
        where: { eventId_userId: { eventId: event.id, userId: viewer.id } },
      })
    : null;
  const isRegistered = registration_?.status === "REGISTERED";

  return (
    <div className="site-container py-12">
      {/* Status banner — P1: money state is one glance away */}
      {registration === "closed" ? (
        <div className="mb-6 rounded-card border border-warning/40 bg-warning/10 p-4 text-sm font-semibold text-ink">
          Registration for this hackathon has closed.
        </div>
      ) : null}

      <header className="text-center">
        {verified ? (
          <PrizeVerifiedBadge />
        ) : (
          <Badge variant={statusTone(event.status)}>{STATUS_LABELS[event.status]}</Badge>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <h1 className="font-display text-3xl leading-tight font-bold text-ink sm:text-4xl">
            {event.title}
          </h1>
          <Badge variant="neutral">
            <Users aria-hidden className="size-3.5" /> {event._count.teams} team
            {event._count.teams === 1 ? "" : "s"}
          </Badge>
        </div>
        {event.summary ? (
          <p className="mx-auto mt-2 max-w-2xl text-lg text-muted">{event.summary}</p>
        ) : null}
      </header>

      {!verified ? (
        <div className="mt-6 rounded-card border border-warning/40 bg-warning/10 p-4">
          <p className="text-sm leading-6 text-ink">
            <strong>Prize pending verification.</strong> The organizer has declared a{" "}
            {formatKes(poolKes)} pool. This hackathon goes live only after 100% of it is locked in
            the Prize Vault, and your build is never chasing money that doesn&apos;t exist yet.
          </p>
        </div>
      ) : null}

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] xl:gap-8">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardTitle className="text-center text-base font-semibold text-muted">Status</CardTitle>
            <div className="mt-3 overflow-x-auto">
              <StatusTimeline status={event.status} />
            </div>
          </Card>

          <Card>
            <CardTitle>Problem Statement</CardTitle>
            <p className="mt-3 leading-7 whitespace-pre-line text-ink-soft">
              {event.problemStatement}
            </p>
            {event.rules ? (
              <>
                <CardTitle className="mt-6 text-base">Rules</CardTitle>
                <p className="mt-2 text-sm leading-6 whitespace-pre-line text-muted">
                  {event.rules}
                </p>
              </>
            ) : null}
            {event.rolesWanted.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {event.rolesWanted.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            ) : null}
          </Card>
        </div>

        <aside className="space-y-6" aria-label="Hackathon details">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <Card>
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Prize pool</p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">{formatKes(poolKes)}</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Runs</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
                <CalendarDays aria-hidden className="size-4" />
                {dateFormat.format(event.startsAt)} to {dateFormat.format(event.endsAt)}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <Clock aria-hidden className="size-3.5" />
                {timeFormat.format(event.startsAt)}
              </p>
            </Card>
            <Card>
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Venue</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
                <MapPin aria-hidden className="size-4" />
                {event.venueType === "ONLINE"
                  ? "Online"
                  : (event.location ?? event.venueType.toLowerCase())}
              </p>
              <p className="mt-1 text-xs text-muted capitalize">{event.venueType.toLowerCase()}</p>
            </Card>
          </div>

          {/* CTA */}
          <div>
            {isRegistered ? (
              <div className="space-y-3">
                <Badge variant="success">Registered ✓</Badge>
                <Link href={`/hackathons/${event.slug}/workspace`} className="block">
                  <Button arrow size="lg" className="w-full">
                    Open Team Workspace
                  </Button>
                </Link>
              </div>
            ) : open ? (
              viewer ? (
                <form action={`/api/events/${event.slug}/register`} method="post">
                  <Button type="submit" size="lg" className="w-full">
                    Register For This Hackathon
                  </Button>
                </form>
              ) : (
                <Link href="/signin" className="block">
                  <Button size="lg" arrow className="w-full">
                    Sign In To Register
                  </Button>
                </Link>
              )
            ) : (
              <Button size="lg" disabled className="w-full">
                Registration Closed
              </Button>
            )}
          </div>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardTitle>Prize Breakdown</CardTitle>
          <ul className="mt-3 text-sm">
            {event.prizes.map((prize) => {
              const winner = event.winners.find((w) => w.place === prize.place);
              const instantNote = winner
                ? winner.payouts.some((p) => p.tranche === "INSTANT" && p.status === "SUCCEEDED")
                  ? "50% paid ✓"
                  : "paying…"
                : "50% on the day";
              const restNote = prize.milestoneRequired ? "50% on milestone" : "full payout on win";
              return (
                <li
                  key={prize.id}
                  className="flex items-start justify-between gap-4 border-b border-ink/5 py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{prize.label}</p>
                    {winner ? (
                      <p className="text-xs text-muted">
                        won by {winner.team.name} ·{" "}
                        <Link href={`/developers/${winner.user.handle}`} className="underline">
                          @{winner.user.handle}
                        </Link>
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-muted">
                      {instantNote} · {restNote}
                    </p>
                  </div>
                  <p className="shrink-0 font-display text-base font-bold whitespace-nowrap text-ink">
                    {formatKes(prize.amountKes)}
                  </p>
                </li>
              );
            })}
          </ul>
          <CardDescription>
            Winners receive 50% instantly on the day; the rest releases on verified milestone
            completion.
          </CardDescription>
        </Card>

        <Card>
          <CardTitle>Organizer</CardTitle>
          <p className="mt-2 text-lg font-bold text-ink">{event.org.name}</p>
          <p className="text-sm text-muted">{event.org.about}</p>
          <div className="mt-3">
            <Badge variant="success">Trust score {event.org.trustScore}</Badge>
          </div>
          <CardDescription>
            Trust scores move with payout speed, media delivery, and milestone honesty.
          </CardDescription>
        </Card>

        <KeyDatesCard event={event} />
      </div>

      {/* Public gallery — 48-hour media vault */}
      {gallery.length > 0 ? (
        <Card className="mt-6">
          <CardTitle>Hackathon Gallery</CardTitle>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {gallery.map((asset) => (
              <li key={asset.id} className="overflow-hidden rounded-card border border-ink/10">
                {asset.kind === "PHOTO" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- media vault assets from dynamic storage
                  <img
                    src={asset.url}
                    alt={asset.caption ?? "Hackathon photo"}
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <video src={asset.url} controls className="aspect-[4/3] w-full" />
                )}
              </li>
            ))}
          </ul>
          <CardDescription>
            Delivered within the 48-hour standard: high-resolution, community-first.
          </CardDescription>
        </Card>
      ) : null}
    </div>
  );
}

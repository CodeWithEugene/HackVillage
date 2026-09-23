import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";

import { PrizeVerifiedBadge } from "@/components/patterns/prize-verified-badge";
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
  if (!event) return { title: "Event not found" };
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
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      {/* Status banner — P1: money state is one glance away */}
      {registration === "closed" ? (
        <div className="mb-6 rounded-card border border-warning/40 bg-warning/10 p-4 text-sm font-semibold text-ink">
          Registration for this event has closed.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {verified ? (
            <PrizeVerifiedBadge />
          ) : (
            <Badge variant={statusTone(event.status)}>{STATUS_LABELS[event.status]}</Badge>
          )}
        </div>
        <Badge variant="neutral">
          <Users aria-hidden className="size-3.5" /> {event._count.teams} team
          {event._count.teams === 1 ? "" : "s"}
        </Badge>
      </div>

      <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
        {event.title}
      </h1>
      {event.summary ? <p className="mt-2 text-lg text-muted">{event.summary}</p> : null}

      {!verified ? (
        <div className="mt-6 rounded-card border border-warning/40 bg-warning/10 p-4">
          <p className="text-sm leading-6 text-ink">
            <strong>Prize pending verification.</strong> The organizer has declared a{" "}
            {formatKes(poolKes)} pool. This event goes live only after 100% of it is locked in the
            Prize Vault — your build is never chasing money that doesn&apos;t exist yet.
          </p>
        </div>
      ) : null}

      <Card className="mt-6">
        <CardTitle className="text-base font-semibold text-muted">Status</CardTitle>
        <div className="mt-3 overflow-x-auto">
          <StatusTimeline status={event.status} />
        </div>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Prize pool</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{formatKes(poolKes)}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Runs</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <CalendarDays aria-hidden className="size-4" />
            {dateFormat.format(event.startsAt)} – {dateFormat.format(event.endsAt)}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <Clock aria-hidden className="size-3.5" />
            {timeFormat.format(event.startsAt)}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Venue</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <MapPin aria-hidden className="size-4" />
            {event.venueType === "ONLINE"
              ? "Online"
              : (event.location ?? event.venueType.toLowerCase())}
          </p>
          <p className="mt-1 text-xs text-muted capitalize">{event.venueType.toLowerCase()}</p>
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle>Problem statement</CardTitle>
        <p className="mt-3 whitespace-pre-line leading-7 text-ink-soft">
          {event.problemStatement}
        </p>
        {event.rules ? (
          <>
            <CardTitle className="mt-6 text-base">Rules</CardTitle>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">{event.rules}</p>
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

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>Prize breakdown</CardTitle>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {event.prizes.map((prize) => {
                const winner = event.winners.find((w) => w.place === prize.place);
                return (
                  <tr key={prize.id} className="border-b border-ink/5 last:border-0">
                    <td className="py-2 font-semibold text-ink">
                      {prize.label}
                      {winner ? (
                        <span className="block text-xs font-normal text-muted">
                          won by {winner.team.name} ·{" "}
                          <Link href={`/developers/${winner.user.handle}`} className="underline">
                            @{winner.user.handle}
                          </Link>
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 text-right font-display text-base font-bold text-ink">
                      {formatKes(prize.amountKes)}
                    </td>
                    <td className="py-2 pl-3 text-right text-xs text-muted">
                      {winner
                        ? winner.payouts.some((p) => p.tranche === "INSTANT" && p.status === "SUCCEEDED")
                          ? "50% paid ✓"
                          : "paying…"
                        : "50% on the day"}
                      <br />
                      {prize.milestoneRequired ? "50% on milestone" : "full payout on win"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
      </div>

      {/* Public gallery — 48-hour media vault */}
      {gallery.length > 0 ? (
        <Card className="mt-6">
          <CardTitle>Event gallery</CardTitle>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {gallery.map((asset) => (
              <li key={asset.id} className="overflow-hidden rounded-card border border-ink/10">
                {asset.kind === "PHOTO" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- media vault assets from dynamic storage
                  <img src={asset.url} alt={asset.caption ?? "Event photo"} className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <video src={asset.url} controls className="aspect-[4/3] w-full" />
                )}
              </li>
            ))}
          </ul>
          <CardDescription>
            Delivered within the 48-hour standard — high-resolution, community-first.
          </CardDescription>
        </Card>
      ) : null}

      {/* CTA */}
      <div className="mt-8">
        {isRegistered ? (
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="success">Registered ✓</Badge>
            <Link href={`/events/${event.slug}/workspace`}>
              <Button>Open team workspace</Button>
            </Link>
          </div>
        ) : open ? (
          viewer ? (
            <form action={`/api/events/${event.slug}/register`} method="post">
              <Button type="submit" size="lg">
                Register for this event
              </Button>
            </form>
          ) : (
            <Link href="/signin">
              <Button size="lg">Sign in to register</Button>
            </Link>
          )
        ) : (
          <Button size="lg" disabled>
            Registration closed
          </Button>
        )}
      </div>
    </div>
  );
}

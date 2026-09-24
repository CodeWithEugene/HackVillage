import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";

import { PublishGate } from "@/components/organizer/publish-gate";
import { JudgingSection } from "@/components/judging/judging-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { STATUS_LABELS } from "@/lib/events/lifecycle";
import { formatKes } from "@/lib/utils";

export const metadata: Metadata = { title: "Event command center" };

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EventCommandCenterPage({ params }: PageProps) {
  const [{ slug }, user] = await Promise.all([params, requireUser()]);

  const event = await prisma.event.findFirst({
    where: { slug },
    include: {
      org: { select: { id: true, name: true } },
      prizes: { orderBy: { place: "asc" } },
      registrations: {
        where: { status: "REGISTERED" },
        include: { user: { select: { name: true, handle: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      teams: {
        where: { status: { not: "DISBANDED" } },
        include: {
          leader: { select: { handle: true } },
          members: {
            where: { status: "JOINED" },
            include: { user: { select: { name: true, handle: true } } },
          },
          submission: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!event) notFound();

  const membership = await prisma.orgMember.findFirst({
    where: {
      orgId: event.org.id,
      userId: user.id,
      status: "ACTIVE",
      role: { in: ["OWNER", "ADMIN"] },
    },
  });
  if (!membership) notFound();

  const poolKes = event.prizes.reduce((sum, prize) => sum + prize.amountKes, 0);
  const isDraft = event.status === "DRAFT";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isDraft ? "neutral" : event.status === "PENDING_DEPOSIT" ? "warning" : "success"}>
              {STATUS_LABELS[event.status]}
            </Badge>
            <span className="text-xs text-muted">{event.org.name}</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink">{event.title}</h1>
          <p className="mt-1 text-xs text-muted">
            hackvillage.app/events/{event.slug}
          </p>
        </div>
        {isDraft ? (
          <Link href={`/organizer/events/${event.slug}/edit`}>
            <Button variant="secondary">Edit draft</Button>
          </Link>
        ) : null}
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Prize pool</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{formatKes(poolKes)}</p>
          <p className="mt-1 text-xs text-muted">
            + 5% platform fee ({formatKes(Math.round(poolKes * 0.05))}) due at deposit
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Registrations</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{event.registrations.length}</p>
          <p className="mt-1 text-xs text-muted">closes {new Date(event.registrationDeadline).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Teams</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">
            {event.teams.length}/{event.maxTeams}
          </p>
          <p className="mt-1 text-xs text-muted">
            {event.teams.filter((team) => team.submission).length} submission
            {event.teams.filter((team) => team.submission).length === 1 ? "" : "s"}
          </p>
        </Card>
      </div>

      {isDraft ? (
        <PublishGate eventId={event.id} />
      ) : event.status === "PENDING_DEPOSIT" ? (
        <Card className="border-warning/40">
          <CardTitle className="flex items-center gap-2">
            <Lock aria-hidden className="size-5 text-warning" /> Waiting on the Prize Vault
          </CardTitle>
          <CardDescription>
            This event is public as <strong>pending deposit</strong> — visible but not live.
            Fund the vault ({formatKes(poolKes)} pool + 5% fee) and the event flips LIVE with the
            Prize Verified badge the moment the deposit confirms.
          </CardDescription>
          <Link href={`/organizer/events/${event.slug}/vault`} className="mt-4 inline-block">
            <Button>Open the Prize Vault</Button>
          </Link>
        </Card>
      ) : null}

      {/* Judging section — LIVE events past their end, and JUDGING events */}
      {(event.status === "LIVE" ||
        event.status === "IN_PROGRESS" ||
        event.status === "JUDGING") && (
        <JudgingSection eventId={event.id} slug={event.slug} endsAt={event.endsAt} status={event.status} />
      )}

      <Card>
        <CardTitle>Problem statement</CardTitle>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">
          {event.problemStatement}
        </p>
        {event.prizes.length > 0 ? (
          <table className="mt-4 w-full text-sm">
            <tbody>
              {event.prizes.map((prize) => (
                <tr key={prize.id} className="border-b border-ink/5 last:border-0">
                  <td className="py-2 font-semibold text-ink">{prize.label}</td>
                  <td className="py-2 text-right font-semibold">{formatKes(prize.amountKes)}</td>
                  <td className="py-2 pl-3 text-right text-xs text-muted">
                    {prize.milestoneRequired ? "milestone on final 50%" : "full payout on win"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </Card>

      <Card>
        <CardTitle>Registrations ({event.registrations.length})</CardTitle>
        {event.registrations.length === 0 ? (
          <CardDescription>Nobody has registered yet — shares of the event page help.</CardDescription>
        ) : (
          <ul className="mt-3 divide-y divide-ink/5">
            {event.registrations.map(({ id, user: attendee }) => (
              <li key={id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-semibold text-ink">{attendee.name ?? `@${attendee.handle}`}</span>
                <span className="text-muted">@{attendee.handle}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle>Teams &amp; submissions ({event.teams.length})</CardTitle>
        {event.teams.length === 0 ? (
          <CardDescription>Teams form once registration opens.</CardDescription>
        ) : (
          <ul className="mt-3 space-y-4">
            {event.teams.map((team) => (
              <li key={team.id} className="rounded-control border border-ink/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{team.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={team.submission ? "success" : "neutral"}>
                      {team.submission ? "submitted" : "building"}
                    </Badge>
                    <Badge>led by @{team.leader.handle}</Badge>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {team.members.map((m) => `@${m.user.handle}`).join(" · ")}
                </p>
                {team.submission ? (
                  <div className="mt-2 text-sm">
                    <a
                      href={team.submission.repoUrl}
                      className="font-semibold text-ink underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {team.submission.repoUrl.replace(/^https?:\/\//, "").slice(0, 48)}
                    </a>
                    {team.submission.demoUrl ? (
                      <>
                        {" · "}
                        <a
                          href={team.submission.demoUrl}
                          className="font-semibold text-ink underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          demo
                        </a>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

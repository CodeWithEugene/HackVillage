import Link from "next/link";
import { BadgeCheck, HandCoins, Map, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PILLARS = [
  {
    icon: HandCoins,
    title: "The Instant Reward Protocol",
    description:
      "Organizers deposit 100% of the prize pool before an event goes live. Winners receive 50% instantly on the day; the rest is released on verified milestone completion. No escrow, no live event.",
  },
  {
    icon: BadgeCheck,
    title: "Developer Value Beyond the Prize",
    description:
      "Every event builds a verifiable Proof-of-Work profile — win rates, GitHub contributions per event, and judge endorsements. Events become audition stages for internships and mentorships.",
  },
  {
    icon: ShieldCheck,
    title: "The Stakeholder Quality Guarantee",
    description:
      "Professional standards and instant rewards attract top-tier talent. Organizations receive production-ready solutions and actionable data — not polished pitches with no follow-through.",
  },
];

const PHASES = [
  {
    step: "01",
    title: "Setup",
    description:
      "Organizers deposit funds, upload problem statements, and tag roles. The platform validates escrow and issues the Prize Verified badge.",
  },
  {
    step: "02",
    title: "Engagement",
    description:
      "Developers browse verified events, form teams, build, and submit. The platform provides project management and real-time judging tools.",
  },
  {
    step: "03",
    title: "Closing",
    description:
      "Winners are announced, 50% of prizes pay out instantly, structured judge feedback is delivered, and every deposit and payout is recorded on the public ledger.",
  },
];

const PROMISES = [
  { value: "100%", label: "of the prize pool locked in escrow before an event goes live" },
  { value: "50%", label: "of winnings paid the same day — M-Pesa or bank" },
  { value: "48h", label: "deadline for organizers to deliver event media" },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 pb-20 pt-16 text-center sm:pt-24">
        <Badge variant="brand">
          Open-source core · Apache-2.0
        </Badge>
        <h1 className="max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight text-ink sm:text-6xl">
          The open-source infrastructure for{" "}
          <span className="bg-brand px-2">high-impact</span> tech events
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-muted">
          Trust-as-a-Service for developers. Innovation-as-a-Service for
          organizations. Every hackathon on HackVillage is Prize Verified — the
          money is real before you write a single line of code.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/events">
            <Button size="lg">Browse events</Button>
          </Link>
          <a href="https://github.com/CodeWithEugene/HackVillage">
            <Button size="lg" variant="secondary">
              Host a Prize Verified event
            </Button>
          </a>
        </div>
      </section>

      {/* Promises band */}
      <section aria-label="Platform promises" className="border-y border-ink/10 bg-ink text-paper">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          {PROMISES.map((promise) => (
            <div key={promise.value} className="text-center">
              <p className="font-display text-4xl font-bold text-brand">{promise.value}</p>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-paper/70">
                {promise.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20">
        <h2 className="text-center font-display text-3xl font-bold text-ink">
          The HackVillage Standard
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted">
          A Developer Bill of Rights and an Organizer Performance Guarantee,
          enforced through three non-negotiable pillars.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PILLARS.map((pillar) => (
            <Card key={pillar.title}>
              <span className="flex size-12 items-center justify-center rounded-control bg-brand">
                <pillar.icon aria-hidden className="size-6 text-ink" />
              </span>
              <CardTitle className="mt-4">{pillar.title}</CardTitle>
              <CardDescription>{pillar.description}</CardDescription>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20">
        <h2 className="text-center font-display text-3xl font-bold text-ink">How it works</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted">
          A three-phase engine — from verified funds to verified outcomes.
        </p>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {PHASES.map((phase) => (
            <li key={phase.step} className="rounded-card border border-ink/10 bg-white p-6 shadow-card">
              <span className="inline-flex size-12 items-center justify-center rounded-control bg-brand font-display text-xl font-bold text-ink">
                {phase.step}
              </span>
              <h3 className="mt-3 font-display text-lg font-bold text-ink">{phase.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{phase.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20">
        <div className="rounded-card bg-ink px-6 py-14 text-center text-paper shadow-card">
          <h2 className="font-display text-3xl font-bold">
            Organizers ghost winners. <span className="text-brand">We fixed that.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-paper/70">
            Deposits are locked before the event starts, payouts are recorded on a
            public ledger, and every submission builds a permanent Proof-of-Work
            portfolio.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/events">
              <Button size="lg">Browse events</Button>
            </Link>
            <a href="https://github.com/CodeWithEugene/HackVillage">
              <Button size="lg" variant="secondary" className="border-paper/30 text-paper hover:bg-paper/10">
                Read the build plan
              </Button>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

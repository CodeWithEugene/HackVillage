import Image from "next/image";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import { BadgeCheck, HandCoins, ShieldCheck } from "lucide-react";

import { CircularBadge } from "@/components/patterns/circular-badge";
import { WavyLines } from "@/components/patterns/wavy-lines";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["700", "900"] });

const HERO_TILES = [
  { src: "/marketing/hero/escrow.webp", alt: "Escrowed prize pools" },
  { src: "/marketing/hero/team.webp", alt: "Build with a team" },
  { src: "/marketing/hero/proof.webp", alt: "Proof-of-Work profile" },
  { src: "/marketing/hero/judging.webp", alt: "Structured judging" },
  { src: "/marketing/hero/payout.webp", alt: "Instant M-Pesa payout" },
  { src: "/marketing/hero/trophy.webp", alt: "Win the prize" },
] as const;

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
      <section className="relative mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[1440px] flex-col justify-center overflow-hidden px-5 py-8 sm:px-10 sm:py-10">
        <WavyLines className="absolute left-2 top-4 h-auto w-32 text-ink/25 sm:left-8 sm:top-8 sm:w-44" />
        <WavyLines className="absolute bottom-4 right-2 h-auto w-32 text-ink/25 sm:bottom-10 sm:right-8 sm:w-44" />
        <CircularBadge
          id="heroBadgeVerified"
          text="Prize Verified"
          size={128}
          className="absolute right-4 top-2 hidden sm:block md:right-10 md:top-6"
        />
        <CircularBadge
          id="heroBadgeSource"
          text="Open Source"
          size={104}
          className="absolute left-6 top-[38%] hidden lg:block"
        />

        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
          <h1
            className={`${playfair.className} text-[2.5rem] font-bold leading-[1.05] text-ink sm:text-6xl`}
          >
            Build. Win.
            <br />
            Get Paid.
          </h1>
          <p className="max-w-md text-base leading-7 text-muted sm:text-lg">
            The prize money is real before you write a single line of code.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Link href="/events">
              <span className="inline-flex items-center rounded-full bg-ink px-9 py-3 text-sm font-semibold text-paper transition-colors hover:bg-ink-soft">
                Explore Events
              </span>
            </Link>
            <a
              href="https://github.com/CodeWithEugene/HackVillage"
              className="text-sm font-medium text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              Host a Prize Verified event
            </a>
          </div>
        </div>

        {/* Desktop / tablet collage */}
        <div className="relative z-10 mt-8 hidden items-stretch gap-3 sm:flex sm:h-[300px] md:mt-10 md:h-[360px] md:gap-4">
          <figure className="flex w-[9%] shrink-0 flex-col justify-center">
            <figcaption className={`${playfair.className} text-sm italic leading-8 text-ink-soft`}>
              Escrowed pools.
              <br />
              Instant payouts.
              <br />
              Verified proof.
            </figcaption>
            <span className="mt-3 h-px w-14 bg-ink/60" />
          </figure>
          <div className="flex w-[16%] flex-col gap-3 md:gap-4">
            <div className="relative flex-1 overflow-hidden rounded-2xl md:rounded-3xl">
              <Image src={HERO_TILES[0].src} alt={HERO_TILES[0].alt} fill sizes="16vw" className="object-cover" />
            </div>
            <div className="relative flex-1 overflow-hidden rounded-2xl md:rounded-3xl">
              <Image src={HERO_TILES[1].src} alt={HERO_TILES[1].alt} fill sizes="16vw" className="object-cover" />
            </div>
          </div>
          <div className="relative w-[20%] overflow-hidden rounded-2xl md:rounded-3xl">
            <Image src={HERO_TILES[2].src} alt={HERO_TILES[2].alt} fill sizes="20vw" priority className="object-cover" />
          </div>
          <div className="flex w-[16%] flex-col gap-3 md:gap-4">
            <div className="relative flex-1 overflow-hidden rounded-2xl md:rounded-3xl">
              <Image src={HERO_TILES[3].src} alt={HERO_TILES[3].alt} fill sizes="16vw" className="object-cover" />
            </div>
            <div className="relative flex-1 overflow-hidden rounded-2xl md:rounded-3xl">
              <Image src={HERO_TILES[4].src} alt={HERO_TILES[4].alt} fill sizes="16vw" className="object-cover" />
            </div>
          </div>
          <div className="relative w-[14%] overflow-hidden rounded-2xl md:rounded-3xl">
            <Image src={HERO_TILES[5].src} alt={HERO_TILES[5].alt} fill sizes="14vw" className="object-cover" />
          </div>
          <figure className="flex w-[9%] shrink-0 flex-col justify-center text-right">
            <figcaption className={`${playfair.className} text-sm italic leading-8 text-ink-soft`}>
              Build
              <br />
              Compete
              <br />
              Get Paid
            </figcaption>
            <span className="ml-auto mt-3 h-px w-14 bg-ink/60" />
          </figure>
        </div>

        {/* Mobile collage — horizontal swipe strip */}
        <div className="relative z-10 mt-8 sm:hidden">
          <p className={`${playfair.className} text-center text-sm italic text-ink-soft`}>
            Escrowed pools &#8226; Instant payouts &#8226; Verified proof
          </p>
          <div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
            {HERO_TILES.map((tile) => (
              <div
                key={tile.src}
                className="relative h-56 w-40 shrink-0 snap-center overflow-hidden rounded-2xl"
              >
                <Image src={tile.src} alt={tile.alt} fill sizes="160px" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Promises band */}
      <section aria-label="Platform promises" className="border-y border-ink/10 bg-ink text-paper">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3">
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
      <section className="mx-auto w-full max-w-7xl px-4 py-20">
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

      {/* How It Works */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-20">
        <h2 className="text-center font-display text-3xl font-bold text-ink">How It Works</h2>
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
      <section className="mx-auto w-full max-w-7xl px-4 pb-20">
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
              <Button size="lg">Browse Events</Button>
            </Link>
            <a href="https://github.com/CodeWithEugene/HackVillage">
              <Button size="lg" variant="secondary" className="border-paper/30 text-paper hover:bg-paper/10">
                Read The Build Plan
              </Button>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

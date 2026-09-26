import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * Below-the-fold context section for the landing page: tells the full
 * HackVillage story in crawlable text (the hero is deliberately terse) and
 * distributes keyword-rich internal links to the money pages. Every claim
 * mirrors /how-escrow-works and the services that implement it.
 */
const PILLARS = [
  {
    title: "Prize Verified hackathons",
    href: "/hackathons",
    copy: "Browse hackathons in Kenya, Africa and online where the full prize pool is already locked in escrow — before registration opens.",
  },
  {
    title: "Escrowed prizes, instant payouts",
    href: "/how-escrow-works",
    copy: "Organizers deposit 100% of the prize pool before going live. Winners are paid 50% within an hour of results, 50% on milestone delivery.",
  },
  {
    title: "Judging builders can trust",
    href: "/how-it-works",
    copy: "Rubric-based scoring, published feedback, and a public ledger record of every lock and payout — the same process for every team.",
  },
  {
    title: "Proof-of-Work portfolios",
    href: "/blog/proof-of-work-portfolio",
    copy: "Every result and judge endorsement builds a verified developer portfolio that follows the builder — plus HackVillage itself is open source.",
  },
];

export function LandingSeo() {
  return (
    <section className="site-container py-16" aria-labelledby="about-hackvillage">
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="about-hackvillage" className="font-display text-2xl font-bold text-ink sm:text-3xl">
          The Open-Source Hackathon Platform Built On Escrowed Prizes
        </h2>
        <div className="mt-6 space-y-4 text-left leading-7 text-body-copy sm:text-center">
          <p>
            <strong>HackVillage</strong> is a hackathon platform for Kenya, Africa and the global
            builder community — and the open-source infrastructure any ecosystem can run high-impact
            tech events on. It covers the full lifecycle: posting a hackathon, team formation,
            rubric-based judging, escrowed prize pools, and instant payouts to winners.
          </p>
          <p>
            The problem it fixes is trust. Across the ecosystem, organizers have announced prizes
            that were never funded and winners who were never paid. On HackVillage, an organizer
            must deposit <strong>100% of the prize pool into escrow</strong> before the hackathon
            goes live, earning its <strong>Prize Verified</strong> badge. Winners receive{" "}
            <strong>50% of their prize within an hour</strong> of results being announced, and the
            rest when their milestone ships. Every lock and payout is attested on a public ledger,
            so anyone can verify the money moved.
          </p>
          <p>
            Every result feeds a builder&rsquo;s <strong>Proof-of-Work portfolio</strong> — verified
            wins and judge endorsements that open hiring introductions. Hackathons should launch
            careers, not just weekend projects. That is what HackVillage is built to guarantee.
          </p>
        </div>
      </div>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((pillar) => (
          <li key={pillar.title}>
            <Link
              href={pillar.href}
              className="group flex h-full flex-col rounded-card bg-surface p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <h3 className="flex items-center justify-between gap-2 font-display text-base font-bold text-ink">
                {pillar.title}
                <ArrowUpRight
                  aria-hidden
                  className="size-4 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">{pillar.copy}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

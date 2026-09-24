import Link from "next/link";

import { HowItWorks } from "@/components/patterns/how-it-works";
import { LandingHero } from "@/components/patterns/landing-hero";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="font-display">
      <LandingHero />

      <HowItWorks />

      {/* Final CTA */}
      <section className="site-container pb-20">
        <div className="rounded-card bg-inverse px-6 py-14 text-center text-on-inverse shadow-card">
          <h2 className="font-display text-3xl font-bold">
            Organizers ghost winners. <span className="text-brand">We fixed that.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-on-inverse/70">
            Deposits are locked before the event starts, payouts are recorded on a public ledger,
            and every submission builds a permanent Proof-of-Work portfolio.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/events">
              <Button size="lg">Browse Events</Button>
            </Link>
            <a href="https://github.com/CodeWithEugene/HackVillage">
              <Button
                size="lg"
                variant="secondary"
                className="border-on-inverse/30 text-on-inverse hover:bg-on-inverse/10"
              >
                Read The Build Plan
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

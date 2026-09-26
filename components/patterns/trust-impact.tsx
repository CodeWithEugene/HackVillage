import Image from "next/image";
import Link from "next/link";
import { Fingerprint, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";

const STATS = [
  { value: "100%", label: "Escrowed before a hackathon goes live" },
  { value: "50%", label: "Paid the instant winners are announced" },
  { value: "1hr", label: "Trust Score target to fully settle a prize" },
] as const;

/**
 * Three zones, matching the reference layout: a narrow text column, a
 * framed hero photo carrying two floating trust callouts, and a tall strip
 * of small photos along the far right edge — with the stat cards running
 * full width beneath the text and photo.
 */
export function TrustImpact() {
  return (
    <section className="site-container trust-impact" aria-labelledby="trust-impact-heading">
      <div className="trust-impact-content">
        <p className="trust-impact-eyebrow">
          <span aria-hidden="true">✦</span> Escrow · Payouts
        </p>
        <h2 id="trust-impact-heading" className="trust-impact-heading">
          Trust Is Built Into Every Step.
        </h2>
        <p className="trust-impact-text">
          From the first deposit to the final payout, every action is verifiable, on the record, and
          impossible to fake.
        </p>
        <Link href="/how-escrow-works">
          <Button arrow className="whitespace-nowrap">
            How Escrow Works
          </Button>
        </Link>
      </div>

      <div className="trust-impact-visual">
        <svg className="trust-impact-star" viewBox="0 0 80 80" aria-hidden="true">
          <path d="M40 0C42 26 54 38 80 40C54 42 42 54 40 80C38 54 26 42 0 40C26 38 38 26 40 0Z" />
        </svg>

        <div className="trust-impact-frame">
          <div className="trust-impact-photo">
            <Image
              src="/marketing/trust/organizer-reviewing-hackathon-prize-funding.webp"
              alt="Kenyan organizer reviewing hackathon prize funding at her laptop"
              fill
              sizes="(max-width: 1023px) 80vw, 460px"
              className="object-cover"
            />
          </div>
        </div>

        <div className="trust-float-card trust-float-card-top">
          <span className="trust-float-icon">
            <Lock aria-hidden size={20} />
          </span>
          <p>Funds locked before Day 1, not promised.</p>
        </div>

        <div className="trust-float-card trust-float-card-bottom">
          <span className="trust-float-icon">
            <Fingerprint aria-hidden size={20} />
          </span>
          <p>Every payout attested on a public ledger.</p>
        </div>
      </div>

      <div className="trust-impact-strip">
        <div className="trust-strip-photo">
          <Image
            src="/marketing/trust/organizer-funding-hackathon-prize-pool.webp"
            alt="Kenyan organizer funding a prize pool from his phone"
            fill
            sizes="200px"
            className="object-cover"
          />
        </div>
        <div className="trust-strip-photo">
          <Image
            src="/marketing/trust/developer-celebrating-prize-payout.webp"
            alt="Kenyan developer celebrating a prize payout on her phone"
            fill
            sizes="200px"
            className="object-cover"
          />
        </div>
        <div className="trust-strip-photo">
          <Image
            src="/marketing/trust/engineer-checking-payout-record.webp"
            alt="Kenyan engineer checking a transaction record on his laptop"
            fill
            sizes="200px"
            className="object-cover"
          />
        </div>
      </div>

      <ul className="trust-stats">
        {STATS.map((stat) => (
          <li key={stat.value} className="trust-stat">
            <span className="trust-stat-value">{stat.value}</span>
            <span className="trust-stat-label">{stat.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

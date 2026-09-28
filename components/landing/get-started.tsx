import { Code2, ReceiptText } from "lucide-react";

import { LandingLink, TextLink } from "@/components/landing/landing-link";

const CONTACT_EMAIL = "info@hackvillage.xyz";

/** Closing call to action, Stripe's "Ready to get started?" block. */
export function GetStarted() {
  return (
    <section className="lp-band lp-band-end" aria-labelledby="lp-start-heading">
      <div className="lp-frame lp-block lp-start">
        <div>
          <h2 id="lp-start-heading" className="lp-start-heading">
            Ready to run a hackathon people trust?
          </h2>
          <p className="lp-start-text">
            Create an account in minutes, or talk to us about a hackathon series for your community,
            campus or company.
          </p>
          <div className="lp-hero-actions">
            <LandingLink href="/signup">Sign Up</LandingLink>
            <LandingLink href={`mailto:${CONTACT_EMAIL}`} variant="secondary">
              Contact Us
            </LandingLink>
          </div>
        </div>
        <div className="lp-start-item">
          <span className="lp-feature-icon">
            <ReceiptText aria-hidden className="size-4" />
          </span>
          <p className="lp-start-item-title">Transparent pricing</p>
          <p>
            A flat 5% platform fee, paid by the organizer on top of the prize pool. Winners keep
            every shilling.
          </p>
          <TextLink href="/how-escrow-works">How escrow works</TextLink>
        </div>
        <div className="lp-start-item">
          <span className="lp-feature-icon">
            <Code2 aria-hidden className="size-4" />
          </span>
          <p className="lp-start-item-title">Start contributing</p>
          <p>Open source and ready to run locally, with seeded demo data, in a few commands.</p>
          <TextLink href="/contribute">Contributor guide</TextLink>
        </div>
      </div>
    </section>
  );
}

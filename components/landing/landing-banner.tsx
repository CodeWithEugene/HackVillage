import Image from "next/image";

import { LandingLink } from "@/components/landing/landing-link";

/** The full-width feature banner: one photo, one promise, one next step. */
export function LandingBanner() {
  return (
    <section className="lp-section" aria-labelledby="lp-banner-heading">
      <div className="lp-frame lp-block lp-block-tight">
        <div className="lp-banner">
          <Image
            src="/marketing/blog/kenyan-developers-building-together.webp"
            alt="Kenyan developers planning their hackathon project together in Nairobi"
            fill
            sizes="(max-width: 1280px) 100vw, 1216px"
            className="object-cover"
          />
          <div className="lp-banner-scrim" aria-hidden="true" />
          <div className="lp-banner-content">
            <h2 id="lp-banner-heading" className="lp-banner-heading">
              Organizers ghost winners.
              <br />
              We fixed that.
            </h2>
            <LandingLink href="/how-escrow-works" className="mt-6">
              How Escrow Works
            </LandingLink>
          </div>
          <p className="lp-banner-mark" aria-hidden="true">
            HackVillage <span>Nairobi</span>
          </p>
        </div>
      </div>
    </section>
  );
}

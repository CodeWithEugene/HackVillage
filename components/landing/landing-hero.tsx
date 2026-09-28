import { HeroRibbon } from "@/components/landing/hero-ribbon";
import { LandingLink } from "@/components/landing/landing-link";
import { HOST_HACKATHON_HREF } from "@/lib/auth/signup-links";

export function LandingHero() {
  return (
    <section className="lp-hero" aria-labelledby="lp-hero-heading">
      <HeroRibbon />
      <div className="lp-frame lp-hero-inner">
        <p className="lp-hero-ticker">
          Prize pools escrowed before a hackathon goes live: <span>100%</span>
        </p>
        <h1 id="lp-hero-heading" className="lp-hero-heading">
          Hackathon infrastructure that pays winners on time.{" "}
          <span>
            Escrow the full prize pool before launch, pay winners half the moment results land, and
            turn every submission into a verified Proof-of-Work portfolio.
          </span>
        </h1>
        <div className="lp-hero-actions">
          <LandingLink href="/hackathons">Browse Hackathons</LandingLink>
          <LandingLink href={HOST_HACKATHON_HREF} variant="secondary">
            Host A Hackathon
          </LandingLink>
        </div>
      </div>
    </section>
  );
}

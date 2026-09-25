import { BuilderJourney } from "@/components/patterns/builder-journey";
import { CtaBanner } from "@/components/patterns/cta-banner";
import { LandingHero } from "@/components/patterns/landing-hero";
import { TrustImpact } from "@/components/patterns/trust-impact";

export default function LandingPage() {
  return (
    <div className="font-display">
      <LandingHero />

      <BuilderJourney />

      <TrustImpact />

      <CtaBanner />
    </div>
  );
}

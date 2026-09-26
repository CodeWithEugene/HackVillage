import type { Metadata } from "next";

import { BuilderJourney } from "@/components/patterns/builder-journey";
import { CtaBanner } from "@/components/patterns/cta-banner";
import { LandingHero } from "@/components/patterns/landing-hero";
import { LandingSeo } from "@/components/patterns/landing-seo";
import { TrustImpact } from "@/components/patterns/trust-impact";

export const metadata: Metadata = {
  // `absolute` because the layout template would double the brand ("… · HackVillage").
  title: { absolute: "HackVillage — Hackathon Platform With Escrowed Prizes" },
  description:
    "The open-source hackathon platform for Kenya and Africa: 100% escrowed prize pools, winners paid 50% instantly, and verified Proof-of-Work developer portfolios.",
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export default function LandingPage() {
  return (
    <div className="font-display">
      <LandingHero />

      <BuilderJourney />

      <TrustImpact />

      <LandingSeo />

      <CtaBanner />
    </div>
  );
}

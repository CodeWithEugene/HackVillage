import type { Metadata } from "next";

import { BuilderJourney } from "@/components/patterns/builder-journey";
import { CtaBanner } from "@/components/patterns/cta-banner";
import { LandingAbout } from "@/components/patterns/landing-about";
import { LandingHero } from "@/components/patterns/landing-hero";
import { TrustImpact } from "@/components/patterns/trust-impact";
import { pageOpenGraph } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  // `absolute` because the layout template would double the brand ("… · HackVillage").
  title: { absolute: "HackVillage: The Hackathon Platform With Escrowed Prizes" },
  description:
    "The open-source hackathon platform for Kenya and Africa: 100% escrowed prize pools, winners paid 50% instantly, and verified Proof-of-Work developer portfolios.",
  alternates: { canonical: "/" },
  openGraph: pageOpenGraph("/"),
};

export default function LandingPage() {
  return (
    <div className="font-display">
      <LandingHero />

      <BuilderJourney />

      <TrustImpact />

      <LandingAbout />

      <CtaBanner />
    </div>
  );
}

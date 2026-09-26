import type { Metadata } from "next";

import { CtaBanner } from "@/components/patterns/cta-banner";
import { HowItWorks } from "@/components/patterns/how-it-works";
import { pageOpenGraph } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "How It Works: Escrowed Prizes, Instant Payouts",
  description:
    "How a HackVillage hackathon runs from first idea to final payday: the prize pool is locked in escrow first, builders team up, every project is judged the same way, and winners are paid instantly.",
  alternates: { canonical: "/how-it-works" },
  openGraph: pageOpenGraph("/how-it-works"),
};

export default function HowItWorksPage() {
  return (
    <div className="pt-8 font-display">
      <HowItWorks headingLevel="h1" />
      <CtaBanner photoSide="left" />
    </div>
  );
}

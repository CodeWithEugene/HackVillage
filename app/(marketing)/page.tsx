import type { Metadata } from "next";

import { AudienceSections } from "@/components/landing/audience-sections";
import { GetStarted } from "@/components/landing/get-started";
import { LandingAbout } from "@/components/landing/landing-about";
import { LandingHero } from "@/components/landing/landing-hero";
import { LatestPosts } from "@/components/landing/latest-posts";
import { PartnerStrip } from "@/components/landing/partner-strip";
import { PlatformGrid } from "@/components/landing/platform-grid";
import { TrustBand } from "@/components/landing/trust-band";
import { pageOpenGraph } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  // `absolute` because the layout template would double the brand ("… · HackVillage").
  title: { absolute: "HackVillage: The Hackathon Platform With Escrowed Prizes" },
  description:
    "The open-source hackathon platform for Kenya and Africa: 100% escrowed prize pools, winners paid 50% instantly, and verified Proof-of-Work developer portfolios.",
  alternates: { canonical: "/" },
  openGraph: pageOpenGraph("/"),
};

/*
 * The landing page follows one continuous frame: every section's content
 * sits inside `.lp-frame`, whose hairline side rules run the full height
 * of the page, with horizontal rules marking where one idea ends.
 */
export default function LandingPage() {
  return (
    <div className="lp">
      <LandingHero />
      <PartnerStrip />
      <PlatformGrid />
      <TrustBand />
      <LandingAbout />
      <AudienceSections />
      <LatestPosts />
      <GetStarted />
    </div>
  );
}

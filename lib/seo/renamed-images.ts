/**
 * Marketing images renamed from generic names (build.webp, win.webp) to
 * descriptive ones, since Google reads file names as an image search signal.
 * next.config.ts turns this list into permanent redirects so old URLs
 * (already indexed, shared, or stored in the database) keep working, and
 * migration 9_5_descriptive_image_names rewrites stored cover paths.
 *
 * Plain object with no imports: next.config.ts loads it directly.
 */
export const RENAMED_IMAGES: Record<string, string> = {
  "/marketing/auth/welcome.webp": "/marketing/auth/hackathon-builders-welcome.webp",

  "/marketing/blog/first-hackathon.webp":
    "/marketing/blog/volunteer-welcoming-developers-to-first-hackathon.webp",
  "/marketing/blog/follow-up.webp":
    "/marketing/blog/developers-reviewing-project-after-hackathon.webp",
  "/marketing/blog/judging.webp": "/marketing/blog/judges-reviewing-prototype-with-scorecard.webp",
  "/marketing/blog/media.webp": "/marketing/blog/photographer-reviewing-hackathon-photos.webp",
  "/marketing/blog/open-source.webp":
    "/marketing/blog/open-source-contributors-reviewing-code.webp",
  "/marketing/blog/organizing.webp": "/marketing/blog/organizer-coordinating-hackathon-team.webp",
  "/marketing/blog/payouts.webp": "/marketing/blog/hackathon-winners-checking-prize-payout.webp",
  "/marketing/blog/portfolio.webp":
    "/marketing/blog/engineer-presenting-portfolio-to-hiring-manager.webp",
  "/marketing/blog/team.webp": "/marketing/blog/kenyan-developers-building-together.webp",

  "/marketing/hackathons/agritech.webp": "/marketing/hackathons/agritech-hackathon-kenya.webp",
  "/marketing/hackathons/ai.webp": "/marketing/hackathons/ai-hackathon-kenya.webp",
  "/marketing/hackathons/civic.webp": "/marketing/hackathons/civic-tech-hackathon-kenya.webp",
  "/marketing/hackathons/climate.webp": "/marketing/hackathons/climate-tech-hackathon-kenya.webp",
  "/marketing/hackathons/edtech.webp": "/marketing/hackathons/edtech-hackathon-kenya.webp",
  "/marketing/hackathons/fintech.webp": "/marketing/hackathons/fintech-hackathon-kenya.webp",
  "/marketing/hackathons/health.webp": "/marketing/hackathons/health-tech-hackathon-kenya.webp",
  "/marketing/hackathons/mobility.webp": "/marketing/hackathons/mobility-hackathon-kenya.webp",
  "/marketing/hackathons/security.webp": "/marketing/hackathons/cybersecurity-hackathon-kenya.webp",
  "/marketing/hackathons/web3.webp": "/marketing/hackathons/web3-hackathon-kenya.webp",

  "/marketing/hero/kenya/center-developer.webp":
    "/marketing/hero/kenya/kenyan-software-engineer-holding-laptop.webp",
  "/marketing/hero/kenya/coding-focus.webp":
    "/marketing/hero/kenya/kenyan-software-engineer-coding-on-laptop.webp",
  "/marketing/hero/kenya/community.webp":
    "/marketing/hero/kenya/nairobi-tech-community-gathering.webp",
  "/marketing/hero/kenya/event-arrival.webp":
    "/marketing/hero/kenya/kenyan-developer-arriving-at-hackathon.webp",
  "/marketing/hero/kenya/hackathon-pair.webp":
    "/marketing/hero/kenya/kenyan-engineers-coding-together.webp",
  "/marketing/hero/kenya/speaker.webp":
    "/marketing/hero/kenya/kenyan-tech-speaker-at-hackathon.webp",
  "/marketing/hero/kenya/team-build.webp":
    "/marketing/hero/kenya/kenyan-developers-collaborating-at-hackathon.webp",

  "/marketing/how-it-works/build.webp":
    "/marketing/how-it-works/developers-collaborating-at-nairobi-hackathon.webp",
  "/marketing/how-it-works/judge.webp":
    "/marketing/how-it-works/developer-demoing-project-to-judge.webp",
  "/marketing/how-it-works/launch.webp":
    "/marketing/how-it-works/organizers-planning-hackathon-challenge.webp",
  "/marketing/how-it-works/reward.webp":
    "/marketing/how-it-works/hackathon-winners-with-trophy.webp",

  "/marketing/journey/build.webp":
    "/marketing/journey/kenyan-developer-building-hackathon-project.webp",
  "/marketing/journey/hired.webp":
    "/marketing/journey/engineer-presenting-portfolio-to-hiring-manager.webp",
  "/marketing/journey/paid.webp":
    "/marketing/journey/developer-receiving-hackathon-prize-payout.webp",
  "/marketing/journey/ship.webp": "/marketing/journey/developer-demoing-mobile-app.webp",
  "/marketing/journey/win.webp": "/marketing/journey/hackathon-winner-with-trophy-and-laptop.webp",

  "/marketing/newsletter/community.webp":
    "/marketing/newsletter/developers-exploring-next-hackathon.webp",

  "/marketing/process/build.webp":
    "/marketing/process/developers-building-at-nairobi-hackathon.webp",
  "/marketing/process/judge.webp":
    "/marketing/process/developer-demoing-project-to-hackathon-judges.webp",
  "/marketing/process/launch.webp":
    "/marketing/process/organizers-planning-hackathon-at-laptop.webp",
  "/marketing/process/reward.webp":
    "/marketing/process/hackathon-winners-checking-payout-beside-trophy.webp",

  "/marketing/trust/deposit.webp": "/marketing/trust/organizer-funding-hackathon-prize-pool.webp",
  "/marketing/trust/escrow.webp":
    "/marketing/trust/organizer-reviewing-hackathon-prize-funding.webp",
  "/marketing/trust/payout.webp": "/marketing/trust/developer-celebrating-prize-payout.webp",
  "/marketing/trust/record.webp": "/marketing/trust/engineer-checking-payout-record.webp",
};

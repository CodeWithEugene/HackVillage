-- Demo hackathons (the seed catalog) stay visible on the site but are kept
-- out of search engines, the sitemap, llms.txt and Event structured data, so
-- Google and AI engines are never told a fictional event is real.
-- Named 9_4 so it sorts after 2_events_teams, which creates "Event".
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- Everything db/seeds/seed.ts creates is a demo.
UPDATE "Event" SET "isDemo" = true WHERE "slug" IN (
  'agri-supply-chain-challenge',
  'ai-for-health-records',
  'civic-tech-build-sprint',
  'clean-energy-hack',
  'climate-data-sprint',
  'coastal-agritech-build',
  'creative-economy-hack',
  'edtech-for-rural-schools',
  'fintech-for-matatu-culture',
  'mobile-money-security-challenge',
  'open-data-nairobi-county',
  'smart-transit-kisumu',
  'swahili-nlp-hackathon'
);

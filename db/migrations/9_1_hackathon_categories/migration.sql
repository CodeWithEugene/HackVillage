-- Hackathon categories (AI, Web3, Fintech...) for card tags and the listing filter.
-- Named 9_1 so it sorts after 2_events_teams (Prisma orders migration folders as
-- strings, so "11_" would run before "2_" on a fresh database). IF NOT EXISTS
-- because databases that already ran this under its old name, 11_hackathon_categories,
-- have the column.
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Hackathon categories (AI, Web3, Fintech...) for card tags and the listing filter.
ALTER TABLE "Event" ADD COLUMN "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];

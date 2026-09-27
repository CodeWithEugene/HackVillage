-- Close the drift left by 9_1_hackathon_categories: it added "categories"
-- nullable with a default, but schema.prisma declares the column NOT NULL.
-- Backfill existing rows first, then enforce the constraint.
UPDATE "Event" SET "categories" = ARRAY[]::TEXT[] WHERE "categories" IS NULL;

ALTER TABLE "Event" ALTER COLUMN "categories" SET NOT NULL;

-- Organizer profile details (kind, location, links, private phone) and the
-- structured KYB submission. Named 9_3 so it sorts after 1_auth_onboarding,
-- which creates "Organization" (Prisma orders migration folders as strings).
CREATE TYPE "OrgKind" AS ENUM ('COMPANY', 'UNIVERSITY', 'COMMUNITY', 'NGO', 'GOVERNMENT');

ALTER TABLE "Organization"
  ADD COLUMN "kind" "OrgKind",
  ADD COLUMN "city" TEXT,
  ADD COLUMN "country" TEXT,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "socialUrl" TEXT,
  ADD COLUMN "contactPhone" TEXT;

CREATE TABLE "KybSubmission" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "kraPin" TEXT,
    "signatoryName" TEXT NOT NULL,
    "signatoryRole" TEXT NOT NULL,
    "notes" TEXT,
    "submittedById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KybSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KybSubmission_orgId_key" ON "KybSubmission"("orgId");

ALTER TABLE "KybSubmission" ADD CONSTRAINT "KybSubmission_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

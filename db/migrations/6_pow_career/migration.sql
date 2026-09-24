-- CreateEnum
CREATE TYPE "EndorsementVisibility" AS ENUM ('PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "PortfolioLifecycle" AS ENUM ('DEMO', 'IN_PRODUCTION', 'PIVOTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InternshipTagKind" AS ENUM ('INTERNSHIP', 'APPRENTICESHIP', 'MENTORSHIP');

-- CreateEnum
CREATE TYPE "IntroStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Endorsement" (
    "id" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "visibility" "EndorsementVisibility" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Endorsement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "repoUrl" TEXT NOT NULL,
    "demoUrl" TEXT,
    "lifecycle" "PortfolioLifecycle" NOT NULL DEFAULT 'DEMO',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternshipTag" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "kind" "InternshipTagKind" NOT NULL,
    "partnerName" TEXT NOT NULL,
    "slots" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,

    CONSTRAINT "InternshipTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Introduction" (
    "id" TEXT NOT NULL,
    "hiringPartnerId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "IntroStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "Introduction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Endorsement_judgeId_developerId_eventId_key" ON "Endorsement"("judgeId", "developerId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioItem_submissionId_key" ON "PortfolioItem"("submissionId");

-- CreateIndex
CREATE INDEX "PortfolioItem_developerId_idx" ON "PortfolioItem"("developerId");

-- CreateIndex
CREATE UNIQUE INDEX "Introduction_hiringPartnerId_developerId_eventId_key" ON "Introduction"("hiringPartnerId", "developerId", "eventId");

-- AddForeignKey
ALTER TABLE "Endorsement" ADD CONSTRAINT "Endorsement_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Endorsement" ADD CONSTRAINT "Endorsement_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Endorsement" ADD CONSTRAINT "Endorsement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternshipTag" ADD CONSTRAINT "InternshipTag_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_hiringPartnerId_fkey" FOREIGN KEY ("hiringPartnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CreateEnum
CREATE TYPE "LegacyOutcome" AS ENUM ('STILL_DEMO', 'IN_PRODUCTION', 'PIVOTED', 'ABANDONED', 'UNRESPONSIVE');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'RESOLVED_RELEASE', 'RESOLVED_REFUND', 'REJECTED');

-- CreateTable
CREATE TABLE "LegacyCheckin" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "outcome" "LegacyOutcome",
    "notes" TEXT,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LegacyCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "winnerId" TEXT NOT NULL,
    "openedBy" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "secondApproverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegacyCheckin_submissionId_key" ON "LegacyCheckin"("submissionId");

-- CreateIndex
CREATE INDEX "LegacyCheckin_dueAt_completedAt_idx" ON "LegacyCheckin"("dueAt", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_winnerId_key" ON "Dispute"("winnerId");

-- AddForeignKey
ALTER TABLE "LegacyCheckin" ADD CONSTRAINT "LegacyCheckin_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Winner"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('INITIATED', 'SUCCEEDED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "VaultChainState" AS ENUM ('AWAITING', 'LOCKED', 'HALF_RELEASED', 'SETTLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('VAULT_CREATED', 'DEPOSIT_LOCKED', 'INSTANT_PAYOUT', 'MILESTONE_PAYOUT', 'VAULT_REFUNDED');

-- CreateEnum
CREATE TYPE "WebhookSource" AS ENUM ('PAYSTACK');

-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "paystackReference" TEXT NOT NULL,
    "grossAmountKes" INTEGER NOT NULL,
    "poolAmountKes" INTEGER NOT NULL,
    "feeKes" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "channel" TEXT,
    "status" "DepositStatus" NOT NULL DEFAULT 'INITIATED',
    "authorizationUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "rawWebhook" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultState" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "amountKes" INTEGER NOT NULL,
    "contractAddress" TEXT,
    "chainState" "VaultChainState" NOT NULL DEFAULT 'AWAITING',
    "lockedAt" TIMESTAMP(3),
    "halfReleasedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "lastTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "payload" JSONB NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" INTEGER,
    "mirroredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "source" "WebhookSource" NOT NULL,
    "eventType" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "signatureOk" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "reason" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_paystackReference_key" ON "Deposit"("paystackReference");

-- CreateIndex
CREATE INDEX "Deposit_eventId_idx" ON "Deposit"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "VaultState_eventId_key" ON "VaultState"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_txHash_key" ON "LedgerEntry"("txHash");

-- CreateIndex
CREATE INDEX "LedgerEntry_eventId_idx" ON "LedgerEntry"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_source_eventType_reference_key" ON "WebhookEvent"("source", "eventType", "reference");

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultState" ADD CONSTRAINT "VaultState_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CreateEnum
CREATE TYPE "DocumentScope" AS ENUM ('ORDER', 'OFFER', 'CONTRACT');

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "orderNo" TEXT,
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedBy" TEXT;

-- AlterTable
ALTER TABLE "Offer"
ADD COLUMN "offerNo" TEXT;

-- AlterTable
ALTER TABLE "Contract"
ADD COLUMN "contractNo" TEXT;

-- CreateTable
CREATE TABLE "DocumentSequence" (
  "id" TEXT NOT NULL,
  "scope" "DocumentScope" NOT NULL,
  "timeBucket" TEXT NOT NULL,
  "counter" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNo_key" ON "Order"("orderNo");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_offerNo_key" ON "Offer"("offerNo");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNo_key" ON "Contract"("contractNo");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSequence_scope_timeBucket_key" ON "DocumentSequence"("scope", "timeBucket");

-- CreateIndex
CREATE INDEX "DocumentSequence_scope_timeBucket_idx" ON "DocumentSequence"("scope", "timeBucket");

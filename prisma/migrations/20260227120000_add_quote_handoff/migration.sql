DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuoteStatus') THEN
    CREATE TYPE "QuoteStatus" AS ENUM ('QUOTE', 'PENDING_SIGNATURE', 'CONFIRMED', 'SCHEDULED', 'CANCELLED', 'EXPIRED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuoteSource') THEN
    CREATE TYPE "QuoteSource" AS ENUM ('PREISE');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuoteServiceContext') THEN
    CREATE TYPE "QuoteServiceContext" AS ENUM ('MOVING', 'MONTAGE', 'ENTSORGUNG', 'SPEZIALSERVICE', 'COMBO');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "Quote" (
  "id" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "status" "QuoteStatus" NOT NULL DEFAULT 'QUOTE',
  "source" "QuoteSource" NOT NULL DEFAULT 'PREISE',
  "serviceContext" "QuoteServiceContext" NOT NULL,
  "packageSpeed" "SpeedType" NOT NULL,
  "draftJson" JSONB NOT NULL,
  "resultJson" JSONB NOT NULL,
  "distanceKm" DOUBLE PRECISION,
  "driveCostCents" INTEGER,
  "subtotalCents" INTEGER NOT NULL,
  "priceMinCents" INTEGER NOT NULL,
  "priceMaxCents" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "orderId" TEXT,
  CONSTRAINT "Quote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Quote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Quote_quoteId_key" ON "Quote"("quoteId");
CREATE UNIQUE INDEX IF NOT EXISTS "Quote_orderId_key" ON "Quote"("orderId");
CREATE INDEX IF NOT EXISTS "Quote_status_idx" ON "Quote"("status");
CREATE INDEX IF NOT EXISTS "Quote_createdAt_idx" ON "Quote"("createdAt");

CREATE TABLE IF NOT EXISTS "QuoteEvent" (
  "id" TEXT NOT NULL,
  "quoteRefId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payloadJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuoteEvent_quoteRefId_fkey" FOREIGN KEY ("quoteRefId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "QuoteEvent_quoteRefId_createdAt_idx" ON "QuoteEvent"("quoteRefId", "createdAt");

ALTER TABLE "Contract"
ADD COLUMN IF NOT EXISTS "signedPdfSha256" TEXT;

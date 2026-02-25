-- Add missing Offer fields required by Prisma schema and booking/admin flows.
ALTER TABLE "Offer"
ADD COLUMN "customNote" TEXT,
ADD COLUMN "discountCents" INTEGER,
ADD COLUMN "discountNote" TEXT,
ADD COLUMN "discountPercent" DOUBLE PRECISION,
ADD COLUMN "isManual" BOOLEAN NOT NULL DEFAULT false;

-- Keep schema aligned with relation optionality.
ALTER TABLE "Offer" ALTER COLUMN "orderId" DROP NOT NULL;

-- Recreate index removed by current Prisma schema.
DROP INDEX IF EXISTS "Contract_signatureProvider_idx";

-- CreateEnum
CREATE TYPE "SignatureProvider" AS ENUM ('DOCUSIGN', 'INTERNAL');

-- AlterTable
ALTER TABLE "Contract"
ADD COLUMN "signatureProvider" "SignatureProvider" NOT NULL DEFAULT 'DOCUSIGN',
ADD COLUMN "signatureTokenHash" TEXT,
ADD COLUMN "signatureTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "fallbackSignedName" TEXT,
ADD COLUMN "fallbackSignedAt" TIMESTAMP(3),
ADD COLUMN "fallbackSignerIp" TEXT,
ADD COLUMN "fallbackSignerUserAgent" TEXT,
ADD COLUMN "fallbackAgbAccepted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Contract_signatureProvider_idx" ON "Contract"("signatureProvider");

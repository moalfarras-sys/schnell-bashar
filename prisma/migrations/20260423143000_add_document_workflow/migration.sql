-- CreateEnum
CREATE TYPE "RequestWorkflowStatus" AS ENUM (
  'NEW',
  'NEEDS_REVIEW',
  'IN_REVIEW',
  'OFFER_DRAFTED',
  'OFFER_SENT',
  'OFFER_ACCEPTED',
  'CONTRACT_DRAFTED',
  'CONTRACT_APPROVED_FOR_SIGNATURE',
  'SIGNATURE_LINK_SENT',
  'SIGNED',
  'COMPLETED',
  'CANCELLED',
  'REJECTED'
);

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM (
  'ANGEBOT',
  'RECHNUNG',
  'AUFTRAG_VERTRAG',
  'MAHNUNG',
  'AGB_APPENDIX'
);

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM (
  'DRAFT',
  'INTERNAL_REVIEW',
  'ADMIN_APPROVED',
  'SENT',
  'VIEWED',
  'ACCEPTED',
  'SIGNATURE_PENDING',
  'SIGNED',
  'VOID',
  'CANCELLED',
  'SUPERSEDED'
);

-- CreateEnum
CREATE TYPE "SigningTokenStatus" AS ENUM (
  'ACTIVE',
  'USED',
  'REVOKED',
  'EXPIRED',
  'SUPERSEDED'
);

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "workflowStatus" "RequestWorkflowStatus" NOT NULL DEFAULT 'NEW';

-- CreateTable
CREATE TABLE "Document" (
  "id" TEXT NOT NULL,
  "type" "DocumentType" NOT NULL,
  "number" TEXT,
  "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "orderId" TEXT,
  "customerData" JSONB NOT NULL,
  "serviceData" JSONB,
  "addressData" JSONB,
  "vatConfig" JSONB,
  "subtotalCents" INTEGER NOT NULL DEFAULT 0,
  "taxCents" INTEGER NOT NULL DEFAULT 0,
  "grossCents" INTEGER NOT NULL DEFAULT 0,
  "paymentDetails" JSONB,
  "dueAt" TIMESTAMP(3),
  "visibleNotes" TEXT,
  "internalNotes" TEXT,
  "legalBlocks" JSONB,
  "includeAgbAppendix" BOOLEAN NOT NULL DEFAULT false,
  "pdfStorageKey" TEXT,
  "pdfUrl" TEXT,
  "currentVersionId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "approvedByUserId" TEXT,
  "customerSignatureEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "dataSnapshot" JSONB NOT NULL,
  "htmlSnapshot" TEXT,
  "pdfStorageKey" TEXT,
  "pdfUrl" TEXT,
  "hash" TEXT NOT NULL,
  "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentLineItem" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "unit" TEXT NOT NULL DEFAULT 'Stück',
  "unitPriceNetCents" INTEGER NOT NULL,
  "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 19,
  "totalNetCents" INTEGER NOT NULL,
  "totalGrossCents" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentNumberSequence" (
  "id" TEXT NOT NULL,
  "type" "DocumentType" NOT NULL,
  "year" INTEGER NOT NULL,
  "prefix" TEXT NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentNumberSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalTextBlock" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "documentTypes" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LegalTextBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SigningToken" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "documentVersionId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "signedAt" TIMESTAMP(3),
  "signerName" TEXT,
  "signerEmail" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "consentText" TEXT,
  "documentHash" TEXT NOT NULL,
  "status" "SigningTokenStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SigningToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSignature" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "documentVersionId" TEXT NOT NULL,
  "signingTokenId" TEXT,
  "signedAt" TIMESTAMP(3) NOT NULL,
  "signerName" TEXT NOT NULL,
  "signerEmail" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "consentText" TEXT,
  "documentHash" TEXT NOT NULL,
  "signedPdfStorageKey" TEXT,
  "signedPdfUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DocumentSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Document_number_key" ON "Document"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Document_currentVersionId_key" ON "Document"("currentVersionId");

-- CreateIndex
CREATE INDEX "Document_type_status_idx" ON "Document"("type", "status");

-- CreateIndex
CREATE INDEX "Document_orderId_idx" ON "Document"("orderId");

-- CreateIndex
CREATE INDEX "Document_approvedAt_idx" ON "Document"("approvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_versionNumber_key" ON "DocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_hash_key" ON "DocumentVersion"("hash");

-- CreateIndex
CREATE INDEX "DocumentVersion_documentId_createdAt_idx" ON "DocumentVersion"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentLineItem_documentId_position_idx" ON "DocumentLineItem"("documentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentNumberSequence_type_year_key" ON "DocumentNumberSequence"("type", "year");

-- CreateIndex
CREATE INDEX "DocumentNumberSequence_prefix_year_idx" ON "DocumentNumberSequence"("prefix", "year");

-- CreateIndex
CREATE UNIQUE INDEX "LegalTextBlock_key_key" ON "LegalTextBlock"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SigningToken_tokenHash_key" ON "SigningToken"("tokenHash");

-- CreateIndex
CREATE INDEX "SigningToken_documentId_status_idx" ON "SigningToken"("documentId", "status");

-- CreateIndex
CREATE INDEX "SigningToken_expiresAt_idx" ON "SigningToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSignature_signingTokenId_key" ON "DocumentSignature"("signingTokenId");

-- CreateIndex
CREATE INDEX "DocumentSignature_documentId_signedAt_idx" ON "DocumentSignature"("documentId", "signedAt");

-- CreateIndex
CREATE INDEX "Order_workflowStatus_idx" ON "Order"("workflowStatus");

-- AddForeignKey
ALTER TABLE "Document"
ADD CONSTRAINT "Document_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document"
ADD CONSTRAINT "Document_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion"
ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion"
ADD CONSTRAINT "DocumentVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document"
ADD CONSTRAINT "Document_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLineItem"
ADD CONSTRAINT "DocumentLineItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SigningToken"
ADD CONSTRAINT "SigningToken_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SigningToken"
ADD CONSTRAINT "SigningToken_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignature"
ADD CONSTRAINT "DocumentSignature_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignature"
ADD CONSTRAINT "DocumentSignature_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignature"
ADD CONSTRAINT "DocumentSignature_signingTokenId_fkey" FOREIGN KEY ("signingTokenId") REFERENCES "SigningToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

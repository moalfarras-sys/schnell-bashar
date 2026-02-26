-- AlterTable: add companyId, discountPercent, discountCents, notes to Invoice
ALTER TABLE "Invoice" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "discountPercent" DOUBLE PRECISION;
ALTER TABLE "Invoice" ADD COLUMN "discountCents" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN "notes" TEXT;

-- CreateTable: InvoiceItem
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'Stück',
    "unitPriceCents" INTEGER NOT NULL,
    "vatPercent" DOUBLE PRECISION NOT NULL DEFAULT 19,
    "lineTotalCents" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");
CREATE INDEX "Invoice_companyId_idx" ON "Invoice"("companyId");

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

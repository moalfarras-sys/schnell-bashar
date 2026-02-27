DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExpensePaymentMethod') THEN
    CREATE TYPE "ExpensePaymentMethod" AS ENUM ('CASH', 'BANK', 'CARD', 'OTHER');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ExpenseCategory" (
  "id" TEXT NOT NULL,
  "nameDe" TEXT NOT NULL,
  "defaultVatRate" DOUBLE PRECISION DEFAULT 19,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "deletedAt" TIMESTAMP(3),
  "deletedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExpenseCategory_nameDe_key" ON "ExpenseCategory"("nameDe");
CREATE INDEX IF NOT EXISTS "ExpenseCategory_active_sortOrder_idx" ON "ExpenseCategory"("active", "sortOrder");

CREATE TABLE IF NOT EXISTS "ExpenseEntry" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "vendor" TEXT,
  "description" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "netCents" INTEGER NOT NULL,
  "vatRatePercent" DOUBLE PRECISION NOT NULL,
  "vatCents" INTEGER NOT NULL,
  "grossCents" INTEGER NOT NULL,
  "paymentMethod" "ExpensePaymentMethod" NOT NULL DEFAULT 'BANK',
  "receiptFileUrl" TEXT,
  "notes" TEXT,
  "createdByUserId" TEXT,
  "deletedAt" TIMESTAMP(3),
  "deletedBy" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExpenseEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExpenseEntry_date_idx" ON "ExpenseEntry"("date");
CREATE INDEX IF NOT EXISTS "ExpenseEntry_categoryId_idx" ON "ExpenseEntry"("categoryId");
CREATE INDEX IF NOT EXISTS "ExpenseEntry_createdByUserId_idx" ON "ExpenseEntry"("createdByUserId");
CREATE INDEX IF NOT EXISTS "ExpenseEntry_deletedAt_idx" ON "ExpenseEntry"("deletedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ExpenseEntry_categoryId_fkey'
      AND table_name = 'ExpenseEntry'
  ) THEN
    ALTER TABLE "ExpenseEntry"
      ADD CONSTRAINT "ExpenseEntry_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ExpenseEntry_createdByUserId_fkey'
      AND table_name = 'ExpenseEntry'
  ) THEN
    ALTER TABLE "ExpenseEntry"
      ADD CONSTRAINT "ExpenseEntry_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "AdminUser"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;


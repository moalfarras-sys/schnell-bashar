DO $$
BEGIN
  CREATE TYPE "ServiceModuleSlug" AS ENUM ('MONTAGE', 'ENTSORGUNG');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "ServiceOptionPricingType" AS ENUM ('FLAT', 'PER_UNIT', 'PER_M3', 'PER_HOUR');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "PromoDiscountType" AS ENUM ('PERCENT', 'FLAT_CENTS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "PricingConfig"
  ADD COLUMN IF NOT EXISTS "montageBaseFeeCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "entsorgungBaseFeeCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "montageStandardMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "montagePlusMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "montagePremiumMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "entsorgungStandardMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "entsorgungPlusMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "entsorgungPremiumMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "montageMinimumOrderCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "entsorgungMinimumOrderCents" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "ServiceModule" (
  "id" TEXT NOT NULL,
  "slug" "ServiceModuleSlug" NOT NULL,
  "nameDe" TEXT NOT NULL,
  "descriptionDe" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "deletedAt" TIMESTAMP(3),
  "deletedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceModule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServiceModule_slug_key" ON "ServiceModule"("slug");

CREATE TABLE IF NOT EXISTS "ServiceOption" (
  "id" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "nameDe" TEXT NOT NULL,
  "descriptionDe" TEXT,
  "pricingType" "ServiceOptionPricingType" NOT NULL DEFAULT 'PER_UNIT',
  "defaultPriceCents" INTEGER NOT NULL,
  "defaultLaborMinutes" INTEGER NOT NULL DEFAULT 0,
  "defaultVolumeM3" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "requiresQuantity" BOOLEAN NOT NULL DEFAULT true,
  "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
  "isHeavy" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "deletedAt" TIMESTAMP(3),
  "deletedBy" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServiceOption_code_key" ON "ServiceOption"("code");
CREATE INDEX IF NOT EXISTS "ServiceOption_moduleId_active_sortOrder_idx" ON "ServiceOption"("moduleId", "active", "sortOrder");

CREATE TABLE IF NOT EXISTS "PromoRule" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "moduleId" TEXT,
  "serviceTypeScope" "ServiceType",
  "discountType" "PromoDiscountType" NOT NULL,
  "discountValue" INTEGER NOT NULL,
  "minOrderCents" INTEGER NOT NULL DEFAULT 0,
  "maxDiscountCents" INTEGER,
  "validFrom" TIMESTAMP(3),
  "validTo" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "deletedAt" TIMESTAMP(3),
  "deletedBy" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromoRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PromoRule_code_key" ON "PromoRule"("code");
CREATE INDEX IF NOT EXISTS "PromoRule_active_code_idx" ON "PromoRule"("active", "code");
CREATE INDEX IF NOT EXISTS "PromoRule_moduleId_active_idx" ON "PromoRule"("moduleId", "active");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceOption_moduleId_fkey') THEN
    ALTER TABLE "ServiceOption"
      ADD CONSTRAINT "ServiceOption_moduleId_fkey"
      FOREIGN KEY ("moduleId") REFERENCES "ServiceModule"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PromoRule_moduleId_fkey') THEN
    ALTER TABLE "PromoRule"
      ADD CONSTRAINT "PromoRule_moduleId_fkey"
      FOREIGN KEY ("moduleId") REFERENCES "ServiceModule"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

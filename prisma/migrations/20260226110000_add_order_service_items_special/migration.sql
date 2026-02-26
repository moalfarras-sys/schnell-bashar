ALTER TYPE "ServiceModuleSlug" ADD VALUE IF NOT EXISTS 'SPECIAL';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderServiceKind') THEN
    CREATE TYPE "OrderServiceKind" AS ENUM ('UMZUG', 'MONTAGE', 'ENTSORGUNG', 'SPECIAL');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "OrderServiceItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "kind" "OrderServiceKind" NOT NULL,
  "moduleId" TEXT,
  "serviceOptionCode" TEXT,
  "titleDe" TEXT NOT NULL,
  "detailsJson" JSONB,
  "qty" INTEGER NOT NULL DEFAULT 1,
  "unit" TEXT NOT NULL DEFAULT 'Pauschale',
  "unitPriceCents" INTEGER NOT NULL DEFAULT 0,
  "lineTotalCents" INTEGER NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderServiceItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderServiceItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OrderServiceItem_orderId_sortOrder_idx" ON "OrderServiceItem"("orderId", "sortOrder");
CREATE INDEX IF NOT EXISTS "OrderServiceItem_kind_idx" ON "OrderServiceItem"("kind");
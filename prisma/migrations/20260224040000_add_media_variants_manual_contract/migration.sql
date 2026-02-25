-- Add manual contract metadata
ALTER TABLE "Contract"
  ADD COLUMN "isManual" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "manualPayload" JSONB;

-- Add media variants for admin crop output
DO $$ BEGIN
  CREATE TYPE "MediaVariantKind" AS ENUM ('hero', 'gallery', 'thumbnail', 'custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "MediaAssetVariant" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "kind" "MediaVariantKind" NOT NULL,
  "path" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAssetVariant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MediaAssetVariant_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MediaAssetVariant_path_key" ON "MediaAssetVariant"("path");
CREATE UNIQUE INDEX IF NOT EXISTS "MediaAssetVariant_assetId_kind_key" ON "MediaAssetVariant"("assetId", "kind");
CREATE INDEX IF NOT EXISTS "MediaAssetVariant_assetId_idx" ON "MediaAssetVariant"("assetId");

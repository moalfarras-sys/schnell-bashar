-- CreateTable
CREATE TABLE "RouteDistanceCache" (
    "id" TEXT NOT NULL,
    "fromPostalCode" TEXT NOT NULL,
    "toPostalCode" TEXT NOT NULL,
    "profile" TEXT NOT NULL DEFAULT 'driving-car',
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteDistanceCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RouteDistanceCache_fromPostalCode_toPostalCode_profile_key" ON "RouteDistanceCache"("fromPostalCode", "toPostalCode", "profile");

-- CreateIndex
CREATE INDEX "RouteDistanceCache_expiresAt_idx" ON "RouteDistanceCache"("expiresAt");

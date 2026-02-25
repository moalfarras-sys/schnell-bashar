-- Add request-first scheduling status.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REQUESTED';

-- Add preferred time window enum for scheduling requests.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PreferredTimeWindow') THEN
    CREATE TYPE "PreferredTimeWindow" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'FLEXIBLE');
  END IF;
END
$$;

-- Extend Order table with request scheduling fields.
ALTER TABLE "Order"
  ALTER COLUMN "slotStart" DROP NOT NULL,
  ALTER COLUMN "slotEnd" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "requestedDateFrom" DATE,
  ADD COLUMN IF NOT EXISTS "requestedDateTo" DATE,
  ADD COLUMN IF NOT EXISTS "preferredTimeWindow" "PreferredTimeWindow",
  ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);

-- Indexes for scheduling workflows.
CREATE INDEX IF NOT EXISTS "Order_requestedDateFrom_idx" ON "Order"("requestedDateFrom");
CREATE INDEX IF NOT EXISTS "Order_scheduledAt_idx" ON "Order"("scheduledAt");

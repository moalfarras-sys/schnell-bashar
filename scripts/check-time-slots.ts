/**
 * Check PostgreSQL for time-slot related data:
 * - AvailabilityRule (defines when slots exist: dayOfWeek, startTime, endTime, slotMinutes, capacity)
 * - AvailabilityException (date overrides: closed, overrideCapacity)
 * - Order slotStart/slotEnd (booked time slots)
 *
 * Run: npx tsx scripts/check-time-slots.ts
 * Requires: DATABASE_URL or default postgresql://postgres:postgres@localhost:5432/schnell_sicher_umzug
 */

import { PrismaClient } from "../prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/schnell_sicher_umzug?schema=public";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

async function main() {
  console.log("=== Time slots data (PostgreSQL) ===\n");

  const rules = await prisma.availabilityRule.findMany({
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  console.log("AvailabilityRule (when slots exist):");
  if (rules.length === 0) {
    console.log("  (none)");
  } else {
    for (const r of rules) {
      console.log(
        `  ${DAY_NAMES[r.dayOfWeek]} ${r.startTime}-${r.endTime} slot=${r.slotMinutes}min capacity=${r.capacity} active=${r.active}`
      );
    }
  }

  const exceptions = await prisma.availabilityException.findMany({
    orderBy: { date: "asc" },
  });
  console.log("\nAvailabilityException (date overrides):");
  if (exceptions.length === 0) {
    console.log("  (none)");
  } else {
    for (const e of exceptions) {
      const cap = e.overrideCapacity != null ? ` capacity=${e.overrideCapacity}` : "";
      console.log(`  ${e.date.toISOString().slice(0, 10)} closed=${e.closed}${cap} ${e.note ?? ""}`);
    }
  }

  const orders = await prisma.order.findMany({
    where: {
      status: { not: "CANCELLED" },
      slotStart: { not: null },
      slotEnd: { not: null },
    },
    select: { publicId: true, slotStart: true, slotEnd: true, status: true },
    orderBy: { slotStart: "asc" },
    take: 50,
  });
  console.log("\nOrder time slots (booked, non-cancelled, latest 50):");
  if (orders.length === 0) {
    console.log("  (none)");
  } else {
    for (const o of orders) {
      if (!o.slotStart || !o.slotEnd) continue;
      console.log(
        `  ${o.publicId} ${o.slotStart.toISOString()} - ${o.slotEnd.toISOString()} [${o.status}]`
      );
    }
  }

  const count = await prisma.order.count({
    where: { status: { not: "CANCELLED" } },
  });
  if (count > 50) console.log(`  ... and ${count - 50} more orders with slots.`);

  console.log("\nDone.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

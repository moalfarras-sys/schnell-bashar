import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/prisma/client";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/schnell_sicher_umzug?schema=public";

// Supabase (and other cloud Postgres) require SSL
const isSupabase = connectionString.includes("supabase.com");
const ssl = isSupabase ? { rejectUnauthorized: true } as const : undefined;
const adapter = new PrismaPg({ connectionString, ...(ssl ? { ssl } : {}) });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Pricing (single active config)
  await prisma.pricingConfig.updateMany({ data: { active: false } });
  await prisma.pricingConfig.create({
    data: {
      active: true,
      currency: "EUR",

      movingBaseFeeCents: 19000,
      disposalBaseFeeCents: 14000,
      hourlyRateCents: 6500,
      perM3MovingCents: 3400,
      perM3DisposalCents: 4800,
      perKmCents: 250,
      heavyItemSurchargeCents: 5500,
      stairsSurchargePerFloorCents: 2500,
      carryDistanceSurchargePer25mCents: 1500,
      parkingSurchargeMediumCents: 6000,
      parkingSurchargeHardCents: 12000,
      elevatorDiscountSmallCents: 800,
      elevatorDiscountLargeCents: 1500,

      uncertaintyPercent: 12,

      economyMultiplier: 0.9,
      standardMultiplier: 1.0,
      expressMultiplier: 1.3,
      economyLeadDays: 10,
      standardLeadDays: 5,
      expressLeadDays: 2,
    },
  });

  // Availability rules (Mon-Sat, 08:00-18:00, 60min slots)
  await prisma.availabilityException.deleteMany();
  await prisma.availabilityRule.deleteMany();
  const baseRules = [
    { dayOfWeek: 1 }, // Mon
    { dayOfWeek: 2 }, // Tue
    { dayOfWeek: 3 }, // Wed
    { dayOfWeek: 4 }, // Thu
    { dayOfWeek: 5 }, // Fri
    { dayOfWeek: 6 }, // Sat
  ];
  for (const r of baseRules) {
    await prisma.availabilityRule.create({
      data: {
        dayOfWeek: r.dayOfWeek,
        startTime: "08:00",
        endTime: "18:00",
        slotMinutes: 60,
        capacity: 2,
        active: true,
      },
    });
  }

  // Catalog items (selection catalog)
  const items = [
    // Furniture
    {
      slug: "sofa-2",
      categoryKey: "furniture",
      nameDe: "Sofa (2‑Sitzer)",
      defaultVolumeM3: 1.8,
      laborMinutesPerUnit: 18,
      isHeavy: false,
      sortOrder: 10,
    },
    {
      slug: "sofa-3",
      categoryKey: "furniture",
      nameDe: "Sofa (3‑Sitzer)",
      defaultVolumeM3: 2.2,
      laborMinutesPerUnit: 22,
      isHeavy: false,
      sortOrder: 11,
    },
    {
      slug: "sofa-l",
      categoryKey: "furniture",
      nameDe: "Sofa (L‑Form)",
      defaultVolumeM3: 3.2,
      laborMinutesPerUnit: 30,
      isHeavy: true,
      sortOrder: 12,
    },
    {
      slug: "bett-einzel",
      categoryKey: "furniture",
      nameDe: "Bettgestell (Einzel)",
      defaultVolumeM3: 1.0,
      laborMinutesPerUnit: 18,
      isHeavy: false,
      sortOrder: 20,
    },
    {
      slug: "bett-doppel",
      categoryKey: "furniture",
      nameDe: "Bettgestell (Doppel)",
      defaultVolumeM3: 1.6,
      laborMinutesPerUnit: 26,
      isHeavy: false,
      sortOrder: 21,
    },
    {
      slug: "matratze-einzel",
      categoryKey: "furniture",
      nameDe: "Matratze (Einzel)",
      defaultVolumeM3: 0.6,
      laborMinutesPerUnit: 8,
      isHeavy: false,
      sortOrder: 22,
    },
    {
      slug: "matratze-doppel",
      categoryKey: "furniture",
      nameDe: "Matratze (Doppel)",
      defaultVolumeM3: 0.9,
      laborMinutesPerUnit: 10,
      isHeavy: false,
      sortOrder: 23,
    },
    {
      slug: "schrank-2t",
      categoryKey: "furniture",
      nameDe: "Kleiderschrank (2‑türig)",
      defaultVolumeM3: 2.0,
      laborMinutesPerUnit: 35,
      isHeavy: false,
      sortOrder: 30,
    },
    {
      slug: "schrank-3t",
      categoryKey: "furniture",
      nameDe: "Kleiderschrank (3‑türig)",
      defaultVolumeM3: 2.6,
      laborMinutesPerUnit: 45,
      isHeavy: true,
      sortOrder: 31,
    },
    {
      slug: "schrank-4t",
      categoryKey: "furniture",
      nameDe: "Kleiderschrank (4‑türig)",
      defaultVolumeM3: 3.2,
      laborMinutesPerUnit: 55,
      isHeavy: true,
      sortOrder: 32,
    },
    {
      slug: "tisch-s",
      categoryKey: "furniture",
      nameDe: "Tisch (klein)",
      defaultVolumeM3: 0.6,
      laborMinutesPerUnit: 10,
      isHeavy: false,
      sortOrder: 40,
    },
    {
      slug: "tisch-m",
      categoryKey: "furniture",
      nameDe: "Tisch (mittel)",
      defaultVolumeM3: 0.9,
      laborMinutesPerUnit: 12,
      isHeavy: false,
      sortOrder: 41,
    },
    {
      slug: "tisch-l",
      categoryKey: "furniture",
      nameDe: "Tisch (groß)",
      defaultVolumeM3: 1.2,
      laborMinutesPerUnit: 16,
      isHeavy: true,
      sortOrder: 42,
    },
    {
      slug: "stuhl",
      categoryKey: "furniture",
      nameDe: "Stuhl",
      defaultVolumeM3: 0.12,
      laborMinutesPerUnit: 2,
      isHeavy: false,
      sortOrder: 43,
    },
    {
      slug: "schreibtisch",
      categoryKey: "furniture",
      nameDe: "Schreibtisch",
      defaultVolumeM3: 0.9,
      laborMinutesPerUnit: 14,
      isHeavy: false,
      sortOrder: 44,
    },
    {
      slug: "regal",
      categoryKey: "furniture",
      nameDe: "Regal / Bücherregal",
      defaultVolumeM3: 0.8,
      laborMinutesPerUnit: 12,
      isHeavy: false,
      sortOrder: 45,
    },
    {
      slug: "tv-board",
      categoryKey: "furniture",
      nameDe: "TV‑Board",
      defaultVolumeM3: 0.6,
      laborMinutesPerUnit: 10,
      isHeavy: false,
      sortOrder: 46,
    },

    // Appliances
    {
      slug: "kuehlschrank",
      categoryKey: "appliance",
      nameDe: "Kühlschrank",
      defaultVolumeM3: 1.0,
      laborMinutesPerUnit: 18,
      isHeavy: true,
      sortOrder: 60,
    },
    {
      slug: "waschmaschine",
      categoryKey: "appliance",
      nameDe: "Waschmaschine",
      defaultVolumeM3: 0.42,
      laborMinutesPerUnit: 16,
      isHeavy: true,
      sortOrder: 61,
    },
    {
      slug: "spuelmaschine",
      categoryKey: "appliance",
      nameDe: "Geschirrspüler",
      defaultVolumeM3: 0.35,
      laborMinutesPerUnit: 14,
      isHeavy: true,
      sortOrder: 62,
    },
    {
      slug: "backofen",
      categoryKey: "appliance",
      nameDe: "Backofen",
      defaultVolumeM3: 0.32,
      laborMinutesPerUnit: 12,
      isHeavy: true,
      sortOrder: 63,
    },
    {
      slug: "mikrowelle",
      categoryKey: "appliance",
      nameDe: "Mikrowelle",
      defaultVolumeM3: 0.08,
      laborMinutesPerUnit: 4,
      isHeavy: false,
      sortOrder: 64,
    },

    // Boxes
    {
      slug: "karton-s",
      categoryKey: "boxes",
      nameDe: "Umzugskarton (S)",
      defaultVolumeM3: 0.05,
      laborMinutesPerUnit: 1,
      isHeavy: false,
      sortOrder: 80,
    },
    {
      slug: "karton-m",
      categoryKey: "boxes",
      nameDe: "Umzugskarton (M)",
      defaultVolumeM3: 0.08,
      laborMinutesPerUnit: 1,
      isHeavy: false,
      sortOrder: 81,
    },
    {
      slug: "karton-l",
      categoryKey: "boxes",
      nameDe: "Umzugskarton (L)",
      defaultVolumeM3: 0.12,
      laborMinutesPerUnit: 1,
      isHeavy: false,
      sortOrder: 82,
    },

    // Special / heavy
    {
      slug: "klavier",
      categoryKey: "special",
      nameDe: "Klavier",
      defaultVolumeM3: 2.4,
      laborMinutesPerUnit: 60,
      isHeavy: true,
      sortOrder: 100,
    },
    {
      slug: "tresor",
      categoryKey: "special",
      nameDe: "Tresor (Safe)",
      defaultVolumeM3: 0.6,
      laborMinutesPerUnit: 40,
      isHeavy: true,
      sortOrder: 101,
    },
    {
      slug: "aquarium",
      categoryKey: "special",
      nameDe: "Aquarium",
      defaultVolumeM3: 0.5,
      laborMinutesPerUnit: 25,
      isHeavy: true,
      sortOrder: 102,
    },
    {
      slug: "glasvitrine",
      categoryKey: "special",
      nameDe: "Glasvitrine",
      defaultVolumeM3: 1.2,
      laborMinutesPerUnit: 30,
      isHeavy: true,
      sortOrder: 103,
    },
  ];

  for (const item of items) {
    await prisma.catalogItem.upsert({
      where: { slug: item.slug },
      update: {
        categoryKey: item.categoryKey,
        nameDe: item.nameDe,
        defaultVolumeM3: item.defaultVolumeM3,
        laborMinutesPerUnit: item.laborMinutesPerUnit,
        isHeavy: item.isHeavy,
        sortOrder: item.sortOrder,
        active: true,
      },
      create: {
        slug: item.slug,
        categoryKey: item.categoryKey,
        nameDe: item.nameDe,
        defaultVolumeM3: item.defaultVolumeM3,
        laborMinutesPerUnit: item.laborMinutesPerUnit,
        isHeavy: item.isHeavy,
        sortOrder: item.sortOrder,
        active: true,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    const isConnectionRefused =
      (e as NodeJS.ErrnoException).code === "ECONNREFUSED" ||
      String((e as Error).message).includes("ECONNREFUSED");
    if (isConnectionRefused) {
      console.error("\n❌ Could not connect to the database.");
      console.error("   Start PostgreSQL first, then run the seed again.");
      console.error("   Example: docker compose up -d");
      console.error("   Or set DATABASE_URL to your running Postgres.\n");
    } else {
      console.error(e);
    }
    await prisma.$disconnect();
    process.exit(1);
  });


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
      montageBaseFeeCents: 14900,
      entsorgungBaseFeeCents: 11900,
      montageStandardMultiplier: 0.98,
      montagePlusMultiplier: 1.0,
      montagePremiumMultiplier: 1.12,
      entsorgungStandardMultiplier: 0.96,
      entsorgungPlusMultiplier: 1.0,
      entsorgungPremiumMultiplier: 1.1,
      montageMinimumOrderCents: 9900,
      entsorgungMinimumOrderCents: 8900,
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

  // Service modules
  const montageModule = await prisma.serviceModule.upsert({
    where: { slug: "MONTAGE" },
    update: {
      nameDe: "Montage",
      descriptionDe: "Professionelle Montage-Services für Küche, Geräte und Möbel.",
      active: true,
      sortOrder: 10,
    },
    create: {
      slug: "MONTAGE",
      nameDe: "Montage",
      descriptionDe: "Professionelle Montage-Services für Küche, Geräte und Möbel.",
      active: true,
      sortOrder: 10,
    },
  });

  const entsorgungModule = await prisma.serviceModule.upsert({
    where: { slug: "ENTSORGUNG" },
    update: {
      nameDe: "Entsorgung",
      descriptionDe: "Fachgerechte Entsorgung von Möbeln, Geräten und Räumung.",
      active: true,
      sortOrder: 20,
    },
    create: {
      slug: "ENTSORGUNG",
      nameDe: "Entsorgung",
      descriptionDe: "Fachgerechte Entsorgung von Möbeln, Geräten und Räumung.",
      active: true,
      sortOrder: 20,
    },
  });

  const serviceOptions = [
    // ── MONTAGE ──────────────────────────────────────────
    {
      moduleId: montageModule.id,
      code: "MONTAGE_KUECHE",
      nameDe: "Küchenmontage komplett",
      descriptionDe: "Komplette Montage oder Teilmontage von Einbauküchen inkl. Arbeitsplatte und Anschlüsse.",
      pricingType: "FLAT" as const,
      defaultPriceCents: 29900,
      defaultLaborMinutes: 240,
      requiresQuantity: false,
      requiresPhoto: true,
      isHeavy: true,
      sortOrder: 10,
    },
    {
      moduleId: montageModule.id,
      code: "MONTAGE_KUECHE_EINFACH",
      nameDe: "Küchenmontage einfach (IKEA / Pakete)",
      descriptionDe: "Aufbau einer modularen Küche aus Paketen (z. B. IKEA, ROLLER).",
      pricingType: "FLAT" as const,
      defaultPriceCents: 14900,
      defaultLaborMinutes: 150,
      requiresQuantity: false,
      requiresPhoto: true,
      isHeavy: false,
      sortOrder: 15,
    },
    {
      moduleId: montageModule.id,
      code: "MONTAGE_WASCHMASCHINE",
      nameDe: "Waschmaschine aufstellen & anschließen",
      descriptionDe: "Aufstellen, Ausrichten, Wasser- und Stromanschluss, Probelauf.",
      pricingType: "PER_UNIT" as const,
      defaultPriceCents: 6900,
      defaultLaborMinutes: 35,
      requiresQuantity: true,
      requiresPhoto: false,
      isHeavy: true,
      sortOrder: 20,
    },
    {
      moduleId: montageModule.id,
      code: "MONTAGE_KUEHLSCHRANK",
      nameDe: "Kühlschrank / Gefrierschrank aufstellen",
      descriptionDe: "Einbau, Ausrichtung und Inbetriebnahme von Kühl- und Gefriergeräten.",
      pricingType: "PER_UNIT" as const,
      defaultPriceCents: 4900,
      defaultLaborMinutes: 25,
      requiresQuantity: true,
      requiresPhoto: false,
      isHeavy: true,
      sortOrder: 30,
    },
    {
      moduleId: montageModule.id,
      code: "MONTAGE_GESCHIRRSPUELER",
      nameDe: "Geschirrspüler anschließen",
      descriptionDe: "Fachgerechter Einbau und Anschluss inkl. Dichtigkeitsprüfung.",
      pricingType: "PER_UNIT" as const,
      defaultPriceCents: 7900,
      defaultLaborMinutes: 40,
      requiresQuantity: true,
      requiresPhoto: false,
      isHeavy: true,
      sortOrder: 35,
    },
    {
      moduleId: montageModule.id,
      code: "MONTAGE_HERD",
      nameDe: "Herd / Backofen anschließen",
      descriptionDe: "Einbau und Anschluss von Herd, Backofen oder Ceranfeld.",
      pricingType: "PER_UNIT" as const,
      defaultPriceCents: 8900,
      defaultLaborMinutes: 45,
      requiresQuantity: true,
      requiresPhoto: false,
      isHeavy: true,
      sortOrder: 40,
    },
    {
      moduleId: montageModule.id,
      code: "MONTAGE_SCHRANK",
      nameDe: "Kleiderschrank aufbauen",
      descriptionDe: "Professioneller Aufbau von Kleiderschränken (Dreh- oder Schiebetüren).",
      pricingType: "PER_UNIT" as const,
      defaultPriceCents: 8900,
      defaultLaborMinutes: 60,
      requiresQuantity: true,
      requiresPhoto: true,
      isHeavy: false,
      sortOrder: 50,
    },
    {
      moduleId: montageModule.id,
      code: "MONTAGE_BETT",
      nameDe: "Bett aufbauen",
      descriptionDe: "Aufbau von Bettgestellen (Einzel, Doppel, Boxspring, Hochbett).",
      pricingType: "PER_UNIT" as const,
      defaultPriceCents: 6900,
      defaultLaborMinutes: 45,
      requiresQuantity: true,
      requiresPhoto: false,
      isHeavy: false,
      sortOrder: 55,
    },
    {
      moduleId: montageModule.id,
      code: "MONTAGE_REGAL",
      nameDe: "Regal aufbauen",
      descriptionDe: "Aufbau und Wandbefestigung von Regalen und Bücherregalen.",
      pricingType: "PER_UNIT" as const,
      defaultPriceCents: 3900,
      defaultLaborMinutes: 30,
      requiresQuantity: true,
      requiresPhoto: false,
      isHeavy: false,
      sortOrder: 60,
    },
    {
      moduleId: montageModule.id,
      code: "MONTAGE_TV",
      nameDe: "TV-Wandhalterung montieren",
      descriptionDe: "TV-Halterung montieren und Fernseher sicher aufhängen.",
      pricingType: "PER_UNIT" as const,
      defaultPriceCents: 5900,
      defaultLaborMinutes: 35,
      requiresQuantity: true,
      requiresPhoto: false,
      isHeavy: false,
      sortOrder: 65,
    },
    {
      moduleId: montageModule.id,
      code: "MONTAGE_SONSTIGE",
      nameDe: "Sonstige Montagearbeiten",
      descriptionDe: "Individuelle Montagearbeiten nach Aufwand (Stundensatz).",
      pricingType: "PER_HOUR" as const,
      defaultPriceCents: 6500,
      defaultLaborMinutes: 60,
      requiresQuantity: true,
      requiresPhoto: false,
      isHeavy: false,
      sortOrder: 90,
    },

    // ── ENTSORGUNG ───────────────────────────────────────
    {
      moduleId: entsorgungModule.id,
      code: "ENTSORGUNG_ELEKTRO",
      nameDe: "Einzelnes Elektrogerät entsorgen",
      descriptionDe: "Abholung und fachgerechte Entsorgung von Kühlschrank, Waschmaschine, Trockner o. Ä.",
      pricingType: "PER_UNIT" as const,
      defaultPriceCents: 5900,
      defaultLaborMinutes: 25,
      requiresQuantity: true,
      requiresPhoto: false,
      isHeavy: true,
      sortOrder: 10,
    },
    {
      moduleId: entsorgungModule.id,
      code: "ENTSORGUNG_SPERRMUELL_KLEIN",
      nameDe: "Sperrmüll-Paket Klein (bis 1 m³)",
      descriptionDe: "Abholung von Sperrmüll bis zu 1 Kubikmeter – ideal für einzelne Möbelstücke.",
      pricingType: "FLAT" as const,
      defaultPriceCents: 9900,
      defaultLaborMinutes: 30,
      requiresQuantity: false,
      requiresPhoto: false,
      isHeavy: false,
      sortOrder: 15,
    },
    {
      moduleId: entsorgungModule.id,
      code: "ENTSORGUNG_SPERRMUELL_MITTEL",
      nameDe: "Sperrmüll-Paket Mittel (1–3 m³)",
      descriptionDe: "Abholung von Sperrmüll bis 3 Kubikmeter – z. B. nach einem Zimmerumbau.",
      pricingType: "FLAT" as const,
      defaultPriceCents: 19900,
      defaultLaborMinutes: 60,
      requiresQuantity: false,
      requiresPhoto: true,
      isHeavy: false,
      sortOrder: 20,
    },
    {
      moduleId: entsorgungModule.id,
      code: "ENTSORGUNG_MOEBEL",
      nameDe: "Einzelmöbel Abholung",
      descriptionDe: "Abholung einzelner Altmöbel (Sofa, Schrank, Tisch, Matratze o. Ä.).",
      pricingType: "PER_UNIT" as const,
      defaultPriceCents: 3900,
      defaultLaborMinutes: 20,
      requiresQuantity: true,
      requiresPhoto: true,
      isHeavy: false,
      sortOrder: 25,
    },
    {
      moduleId: entsorgungModule.id,
      code: "ENTSORGUNG_KELLER",
      nameDe: "Kellerentrümpelung",
      descriptionDe: "Komplette Räumung und Entsorgung des Kellerraums.",
      pricingType: "FLAT" as const,
      defaultPriceCents: 29900,
      defaultLaborMinutes: 120,
      requiresQuantity: false,
      requiresPhoto: true,
      isHeavy: false,
      sortOrder: 30,
    },
    {
      moduleId: entsorgungModule.id,
      code: "ENTSORGUNG_DACHBODEN",
      nameDe: "Dachbodenentrümpelung",
      descriptionDe: "Räumung und Entsorgung des gesamten Dachbodens.",
      pricingType: "FLAT" as const,
      defaultPriceCents: 24900,
      defaultLaborMinutes: 100,
      requiresQuantity: false,
      requiresPhoto: true,
      isHeavy: false,
      sortOrder: 35,
    },
    {
      moduleId: entsorgungModule.id,
      code: "ENTSORGUNG_WOHNUNG",
      nameDe: "Wohnungsauflösung",
      descriptionDe: "Teilweise oder komplette Wohnungsauflösung – Preis nach Volumen.",
      pricingType: "PER_M3" as const,
      defaultPriceCents: 1500,
      defaultLaborMinutes: 15,
      requiresQuantity: true,
      requiresPhoto: true,
      isHeavy: false,
      sortOrder: 40,
    },
    {
      moduleId: entsorgungModule.id,
      code: "ENTSORGUNG_GARTEN",
      nameDe: "Gartenentsorgung",
      descriptionDe: "Entsorgung von Gartenabfällen, Grünschnitt und Gartenmöbeln.",
      pricingType: "FLAT" as const,
      defaultPriceCents: 14900,
      defaultLaborMinutes: 45,
      requiresQuantity: false,
      requiresPhoto: false,
      isHeavy: false,
      sortOrder: 45,
    },
    {
      moduleId: entsorgungModule.id,
      code: "ENTSORGUNG_BUERO",
      nameDe: "Büroauflösung",
      descriptionDe: "Räumung und Entsorgung von Büroeinrichtung – Preis nach Volumen.",
      pricingType: "PER_M3" as const,
      defaultPriceCents: 2500,
      defaultLaborMinutes: 20,
      requiresQuantity: true,
      requiresPhoto: true,
      isHeavy: false,
      sortOrder: 50,
    },
    {
      moduleId: entsorgungModule.id,
      code: "ENTSORGUNG_HAUSHALT",
      nameDe: "Komplette Haushaltsauflösung",
      descriptionDe: "Vollständige Auflösung eines Haushalts inkl. Entsorgung und Besenreinigung.",
      pricingType: "PER_M3" as const,
      defaultPriceCents: 1900,
      defaultLaborMinutes: 20,
      requiresQuantity: true,
      requiresPhoto: true,
      isHeavy: false,
      sortOrder: 55,
    },
  ];

  for (const option of serviceOptions) {
    await prisma.serviceOption.upsert({
      where: { code: option.code },
      update: {
        moduleId: option.moduleId,
        nameDe: option.nameDe,
        descriptionDe: option.descriptionDe,
        pricingType: option.pricingType,
        defaultPriceCents: option.defaultPriceCents,
        defaultLaborMinutes: option.defaultLaborMinutes,
        requiresQuantity: option.requiresQuantity,
        requiresPhoto: option.requiresPhoto,
        active: true,
        sortOrder: option.sortOrder,
      },
      create: {
        ...option,
        active: true,
      },
    });
  }

  const promoRules = [
    {
      code: "MONTAGE10",
      moduleId: montageModule.id,
      serviceTypeScope: "MOVING" as const,
      discountType: "PERCENT" as const,
      discountValue: 10,
      minOrderCents: 15000,
    },
    {
      code: "ENTSORGUNG10",
      moduleId: entsorgungModule.id,
      serviceTypeScope: "DISPOSAL" as const,
      discountType: "PERCENT" as const,
      discountValue: 10,
      minOrderCents: 12000,
    },
    {
      code: "KOMBI5",
      moduleId: null,
      serviceTypeScope: "BOTH" as const,
      discountType: "PERCENT" as const,
      discountValue: 5,
      minOrderCents: 18000,
    },
  ];

  for (const promo of promoRules) {
    await prisma.promoRule.upsert({
      where: { code: promo.code },
      update: {
        moduleId: promo.moduleId,
        serviceTypeScope: promo.serviceTypeScope,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        minOrderCents: promo.minOrderCents,
        active: true,
      },
      create: {
        ...promo,
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


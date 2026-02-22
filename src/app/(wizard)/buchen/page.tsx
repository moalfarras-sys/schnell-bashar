import { prisma } from "@/server/db/prisma";
import { BookingWizard } from "@/app/(wizard)/buchen/wizard-client";
import { BookingFallbackForm } from "@/app/(wizard)/buchen/fallback-form";
import { Container } from "@/components/container";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BookingPage() {
  let pricing:
    | Awaited<ReturnType<typeof prisma.pricingConfig.findFirst>>
    | null = null;
  let catalog: Array<{
    id: string;
    slug: string;
    categoryKey: string;
    nameDe: string;
    defaultVolumeM3: number;
    laborMinutesPerUnit: number;
    isHeavy: boolean;
  }> = [];

  try {
    const [pricingData, catalogData] = await Promise.all([
      prisma.pricingConfig.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" } }),
      prisma.catalogItem.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { nameDe: "asc" }],
        select: {
          id: true,
          slug: true,
          categoryKey: true,
          nameDe: true,
          defaultVolumeM3: true,
          laborMinutesPerUnit: true,
          isHeavy: true,
        },
      }),
    ]);
    pricing = pricingData;
    catalog = catalogData;
  } catch {
    return <BookingUnavailable reason="Das Buchungssystem ist kurzfristig nicht vollständig verfügbar (Datenbankverbindung)." />;
  }

  if (!pricing || catalog.length === 0) {
    return <BookingUnavailable reason="Die Preis- und Katalogdaten sind aktuell nicht verfügbar." />;
  }

  return (
    <BookingWizard
      catalog={catalog}
      pricing={{
        currency: pricing.currency,
        movingBaseFeeCents: pricing.movingBaseFeeCents,
        disposalBaseFeeCents: pricing.disposalBaseFeeCents,
        hourlyRateCents: pricing.hourlyRateCents,
        perM3MovingCents: pricing.perM3MovingCents,
        perM3DisposalCents: pricing.perM3DisposalCents,
        perKmCents: pricing.perKmCents,
        heavyItemSurchargeCents: pricing.heavyItemSurchargeCents,
        stairsSurchargePerFloorCents: pricing.stairsSurchargePerFloorCents,
        carryDistanceSurchargePer25mCents: pricing.carryDistanceSurchargePer25mCents,
        parkingSurchargeMediumCents: pricing.parkingSurchargeMediumCents,
        parkingSurchargeHardCents: pricing.parkingSurchargeHardCents,
        elevatorDiscountSmallCents: pricing.elevatorDiscountSmallCents,
        elevatorDiscountLargeCents: pricing.elevatorDiscountLargeCents,
        uncertaintyPercent: pricing.uncertaintyPercent,
        economyMultiplier: pricing.economyMultiplier,
        standardMultiplier: pricing.standardMultiplier,
        expressMultiplier: pricing.expressMultiplier,
        economyLeadDays: pricing.economyLeadDays,
        standardLeadDays: pricing.standardLeadDays,
        expressLeadDays: pricing.expressLeadDays,
      }}
    />
  );
}

function BookingUnavailable(props: { reason: string }) {
  return (
    <Container className="py-14 sm:py-16">
      <div className="mx-auto max-w-4xl premium-surface rounded-3xl p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          Buchung gerade eingeschränkt
        </h1>
        <p className="mt-3 text-sm font-semibold text-slate-700">
          {props.reason} Bitte senden Sie uns direkt eine Schnellanfrage – wir melden uns schnellstmöglich.
        </p>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
          Tipp: Alternativ erreichen Sie uns sofort unter{" "}
          <a className="font-extrabold text-brand-700 hover:underline" href="tel:+491729573681">
            +49 172 9573681
          </a>{" "}
          oder per WhatsApp.
        </div>
        <div className="mt-6">
          <BookingFallbackForm />
        </div>
      </div>
    </Container>
  );
}

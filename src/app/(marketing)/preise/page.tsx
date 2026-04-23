import type { Metadata } from "next";
import Link from "next/link";
import { BadgeEuro, Clock } from "lucide-react";

import { Container } from "@/components/container";
import { Preisbeispiele } from "@/components/preisbeispiele";
import { PreiseCalculatorSection } from "@/components/preise-calculator-section";
import { Button } from "@/components/ui/button";
import { prisma } from "@/server/db/prisma";

import type { MontageCalculatorOption, PricingData } from "@/app/(marketing)/preise/price-calculator";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Umzug Preise Berlin | Richtpreise für Umzug, Entsorgung & Montage",
  description:
    "Transparente Richtpreise für Umzug, Entsorgung und Möbelmontage. Preisbeispiele ansehen, Leistung auswählen und unverbindliches Angebot anfragen.",
  alternates: { canonical: "/preise" },
};

async function getPricing(): Promise<PricingData | null> {
  try {
    return await prisma.pricingConfig.findFirst({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
      select: {
        movingBaseFeeCents: true,
        disposalBaseFeeCents: true,
        perM3MovingCents: true,
        perM3DisposalCents: true,
        stairsSurchargePerFloorCents: true,
        parkingSurchargeHardCents: true,
        uncertaintyPercent: true,
        economyMultiplier: true,
        standardMultiplier: true,
        expressMultiplier: true,
      },
    });
  } catch {
    return null;
  }
}

async function getMontageOptions(): Promise<MontageCalculatorOption[]> {
  try {
    const montageOptions = await prisma.serviceOption.findMany({
      where: {
        active: true,
        deletedAt: null,
        module: { slug: "MONTAGE", active: true, deletedAt: null },
      },
      orderBy: [{ sortOrder: "asc" }, { nameDe: "asc" }],
      select: {
        code: true,
        nameDe: true,
        descriptionDe: true,
        defaultPriceCents: true,
        requiresQuantity: true,
      },
    });

    return montageOptions.map((option) => ({
      code: option.code,
      nameDe: option.nameDe,
      descriptionDe: option.descriptionDe,
      defaultPriceCents: option.defaultPriceCents,
      requiresQuantity: option.requiresQuantity,
    }));
  } catch {
    return [];
  }
}

export default async function PreisePage() {
  const [pricing, montageCalculatorOptions] = await Promise.all([getPricing(), getMontageOptions()]);

  return (
    <Container className="py-14">
      <div className="max-w-3xl rounded-3xl border border-sky-200/80 bg-white/90 p-6 shadow-[0_16px_42px_rgba(15,23,42,0.14)]">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-950">Richtpreise für Umzug, Entsorgung & Montage</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-700">
          Alle Preisangaben dienen als unverbindliche Orientierung. Das verbindliche Angebot wird
          nach Prüfung Ihrer Anfrage erstellt.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="#price-calculator">
            <Button size="lg" className="gap-2">
              <BadgeEuro className="h-5 w-5" />
              Richtpreis berechnen
            </Button>
          </a>
          <Link href="/booking">
            <Button size="lg" variant="outline" className="gap-2">
              <Clock className="h-5 w-5" />
              Anfrage starten
            </Button>
          </Link>
        </div>
      </div>

      <PreiseCalculatorSection pricing={pricing} montageOptions={montageCalculatorOptions} />
      <Preisbeispiele />

      <div className="mt-10 rounded-3xl border-2 border-sky-200 bg-sky-50/90 p-6 text-sm font-semibold text-slate-900 shadow-sm">
        Wichtiger Hinweis: Query-Parameter dienen nur der internen Vorauswahl im Rechner. Für
        Suchmaschinen ist immer die kanonische Seite <strong>/preise</strong> relevant.
      </div>
    </Container>
  );
}

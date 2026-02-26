import Link from "next/link";
import Image from "next/image";
import { BadgeEuro, CheckCircle2, Clock, Sparkles } from "lucide-react";

import {
  type MontageCalculatorOption,
  type PricingData,
} from "@/app/(marketing)/preise/price-calculator";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Preisbeispiele } from "@/components/preisbeispiele";
import { PreiseCalculatorSection } from "@/components/preise-calculator-section";
import { Reveal } from "@/components/motion/reveal";
import { prisma } from "@/server/db/prisma";
import { getImageSlot } from "@/server/content/slots";
import { loadOperationalSettings } from "@/server/settings/operational-settings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Preise",
};

const packages = [
  {
    title: "Günstig",
    tag: "Preisbewusst",
    desc: "Für flexible Termine mit starkem Preisfokus.",
    bullets: [
      "Ideal bei planbaren Zeitfenstern",
      "Sehr gute Option für Standardvolumen",
      "Kosteneffizient bei längerer Vorlaufzeit",
    ],
  },
  {
    title: "Standard",
    tag: "Meistgewählt",
    desc: "Balance aus Preis, Planungssicherheit und Geschwindigkeit.",
    bullets: [
      "Unsere beliebteste Option",
      "Schnelle Rückmeldung",
      "Transparenter Richtpreis mit klaren Leistungen",
    ],
  },
  {
    title: "Express",
    tag: "Priorisiert",
    desc: "Für dringende Aufträge mit kurzer Vorlaufzeit.",
    bullets: [
      "Priorisierte Planung",
      "Kurzfristige Terminoptionen",
      "Besonders geeignet für eilige Umzüge und Abholungen",
    ],
  },
];

async function getPricing(): Promise<PricingData | null> {
  try {
    const pricing = await prisma.pricingConfig.findFirst({
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
    return pricing;
  } catch {
    return null;
  }
}

export default async function PreisePage() {
  const [banner, pricing, settings, montageOptions] = await Promise.all([
    getImageSlot({
      key: "img.preise.banner",
      fallbackSrc: "/media/gallery/money.jpeg",
      fallbackAlt: "Transparente Preise",
    }),
    getPricing(),
    loadOperationalSettings(),
    prisma.serviceOption.findMany({
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
    }),
  ]);
  const montageCalculatorOptions: MontageCalculatorOption[] = montageOptions.map((option) => ({
    code: option.code,
    nameDe: option.nameDe,
    descriptionDe: option.descriptionDe,
    defaultPriceCents: option.defaultPriceCents,
    requiresQuantity: option.requiresQuantity,
  }));

  return (
    <Container className="py-14">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
          Preise & Pakete
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-700 dark:text-slate-400">
          Transparente Richtpreise ohne versteckte Kosten. Der endgültige Preis wird immer über
          ein verbindliches Angebot bestätigt.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Umzug ab {settings.movingFromPriceEur} €
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Entsorgung ab {settings.disposalFromPriceEur} €
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Montage ab {settings.montageFromPriceEur} €
          </span>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="#price-calculator">
            <Button size="lg">
              <BadgeEuro className="h-5 w-5" />
              Richtpreis berechnen
            </Button>
          </a>
          <Link href="/buchen?context=MOVING">
            <Button size="lg" variant="outline">
              <Clock className="h-5 w-5" />
              Anfrage starten
            </Button>
          </Link>
        </div>
      </div>

      <Reveal className="mt-12">
        <div className="grid gap-6 md:grid-cols-3">
          {packages.map((p, i) => (
            <Link
              key={p.title + i}
              href="#price-calculator"
              className={`relative flex flex-col rounded-3xl border-2 p-6 transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2 ${
                i === 1
                  ? "border-brand-500 bg-brand-50/70 shadow-lg dark:bg-brand-900/20"
                  : "border-slate-300 bg-[color:var(--surface-elevated)] shadow-md hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-slate-600"
              }`}
            >
              {i === 1 && (
                <div className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white shadow-md">
                  <Sparkles className="h-3 w-3" />
                  Empfohlen
                </div>
              )}
              <div className="text-lg font-extrabold text-slate-950 dark:text-white">{p.title}</div>
              <div className="mt-1 text-xs font-bold text-brand-700 dark:text-brand-400">{p.tag}</div>
              <div className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-400">{p.desc}</div>
              <ul className="mt-4 grid gap-2 text-sm text-slate-700 dark:text-slate-400">
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                    {b}
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
      </Reveal>

      <PreiseCalculatorSection pricing={pricing} montageOptions={montageCalculatorOptions} />

      <Reveal className="mt-12">
        <div className="rounded-3xl border-2 border-slate-300 bg-[color:var(--surface-elevated)] p-6 shadow-md dark:border-slate-700 dark:bg-slate-900/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xl font-extrabold text-slate-950 dark:text-white">
                Montage Leistungen & ab-Preise
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Transparente Orientierung für Küchen-, Geräte- und Möbelmontage.
              </p>
            </div>
            <Link href="/buchen?context=MONTAGE">
              <Button>Jetzt Montage anfragen</Button>
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {montageCalculatorOptions.map((option, idx) => (
              <div
                key={option.code}
                className="rounded-2xl border border-slate-300 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {option.nameDe}
                    </div>
                    {option.descriptionDe ? (
                      <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {option.descriptionDe}
                      </div>
                    ) : null}
                  </div>
                  {idx < 2 ? (
                    <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      Beliebt
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 text-base font-extrabold text-brand-700 dark:text-brand-400">
                  ab {Math.max(1, Math.round(option.defaultPriceCents / 100))} €
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/20 dark:text-amber-200">
            Richtpreis: Endgültiger Preis nach Prüfung/Angebot.
          </div>
        </div>
      </Reveal>

      <Preisbeispiele
        starts={{
          movingFromEur: settings.movingFromPriceEur,
          disposalFromEur: settings.disposalFromPriceEur,
          montageFromEur: settings.montageFromPriceEur,
        }}
      />

      <div className="mt-10 rounded-3xl border-2 border-slate-300 bg-slate-50 p-6 text-sm font-semibold text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
        Richtpreis-Hinweis: Alle Werte sind unverbindliche Orientierung auf Basis Ihrer Angaben.
        Der endgültige Preis wird nach Prüfung in einem verbindlichen Angebot festgelegt.
      </div>

      <div className="premium-surface-emphasis relative mt-12 aspect-16/6 overflow-hidden rounded-3xl">
        <Image
          src={banner.src}
          alt={banner.alt || "Transparente Preise"}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 75vw"
        />
      </div>
    </Container>
  );
}

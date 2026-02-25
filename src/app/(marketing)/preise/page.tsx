import Link from "next/link";
import Image from "next/image";
import { BadgeEuro, CheckCircle2, Clock, Sparkles } from "lucide-react";

import { type PricingData } from "@/app/(marketing)/preise/price-calculator";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Preisbeispiele } from "@/components/preisbeispiele";
import { PreiseCalculatorSection } from "@/components/preise-calculator-section";
import { Reveal } from "@/components/motion/reveal";
import { prisma } from "@/server/db/prisma";
import { getImageSlot } from "@/server/content/slots";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Preise",
};

const packages = [
  {
    title: "Günstig",
    tag: "Günstigste Option",
    desc: "Preisbewusst mit flexiblerem Zeitfenster.",
    bullets: [
      "Ideal bei planbaren Terminen",
      "Gute Lösung für Standardvolumen",
      "Günstiger Multiplikator",
    ],
  },
  {
    title: "Standard",
    tag: "Meistgewählt",
    desc: "Balance aus Preis und Schnelligkeit.",
    bullets: [
      "Unsere meistgewählte Option",
      "Schnelle Rückmeldung",
      "Transparenter Preisrahmen",
    ],
  },
  {
    title: "Express",
    tag: "Schnellste Option",
    desc: "Schnellstmöglich (höherer Preis).",
    bullets: [
      "Kurzer Vorlauf",
      "Priorisierte Planung",
      "Für dringende Umzüge und Abholungen",
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
  const banner = await getImageSlot({
    key: "img.preise.banner",
    fallbackSrc: "/media/gallery/money.jpeg",
    fallbackAlt: "Transparente Preise",
  });
  const pricing = await getPricing();

  return (
    <Container className="py-14">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
          Preise & Pakete
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-700 dark:text-slate-400">
          Transparente Preise ohne versteckte Kosten. Nutzen Sie den Preisrechner für eine
          schnelle Orientierung oder starten Sie direkt eine Anfrage.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="#price-calculator">
            <Button size="lg">
              <BadgeEuro className="h-5 w-5" />
              Angebot berechnen
            </Button>
          </a>
          <Link href="/buchung/termin">
            <Button size="lg" variant="outline">
              <Clock className="h-5 w-5" />
              Termin auswählen
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
              className={`relative flex flex-col rounded-3xl border-2 p-6 transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2 ${i === 1
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

      <PreiseCalculatorSection pricing={pricing} />

      <Preisbeispiele />

      <div className="mt-10 rounded-3xl border-2 border-slate-300 bg-slate-50 p-6 text-sm font-semibold text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
        Hinweis: Der finale Preis wird nach Prüfung bestätigt. Der Rechner ist eine Orientierung
        auf Basis Ihrer Angaben (m³, Priorität, Zugang).
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


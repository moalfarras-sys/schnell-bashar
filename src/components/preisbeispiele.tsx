import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";

type ServiceFilter = "UMZUG" | "ENTSORGUNG" | "MONTAGE" | "ALL";

type Example = {
  label: string;
  desc: string;
  minEur: number;
  maxEur: number;
};

const UMZUG_EXAMPLES: Example[] = [
  {
    label: "Klein (1–2 Zimmer)",
    desc: "Bis 25 m³, Standard-Priorität, EG ohne Aufzug",
    minEur: 850,
    maxEur: 1100,
  },
  {
    label: "Mittel (3 Zimmer)",
    desc: "Ca. 40 m³, Standard, 1. OG mit Aufzug",
    minEur: 1400,
    maxEur: 1850,
  },
  {
    label: "Groß (4+ Zimmer / Haus)",
    desc: "Ab 60 m³, Standard oder Express",
    minEur: 2200,
    maxEur: 3000,
  },
];

const ENTSORGUNG_EXAMPLES: Example[] = [
  {
    label: "3 m³ Sperrmüll",
    desc: "Einzelmöbel, Kleinmengen",
    minEur: 280,
    maxEur: 380,
  },
  {
    label: "8 m³ Sperrmüll",
    desc: "Zimmerentrümpelung, mittlere Menge",
    minEur: 520,
    maxEur: 700,
  },
  {
    label: "15 m³ + schwere Teile",
    desc: "Großabholung, z. B. mehrere Geräte",
    minEur: 900,
    maxEur: 1200,
  },
];

const MONTAGE_EXAMPLES: Example[] = [
  {
    label: "2 Möbelteile",
    desc: "z. B. Schrank + Bett, Abbau & Aufbau",
    minEur: 350,
    maxEur: 480,
  },
  {
    label: "6 Möbelteile",
    desc: "z. B. mehrere Schränke, Küchenelemente",
    minEur: 520,
    maxEur: 700,
  },
  {
    label: "10+ Möbelteile",
    desc: "Komplette Wohnung, Umzug inkl. Montage",
    minEur: 800,
    maxEur: 1100,
  },
];

function eur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

export type PreisbeispieleStarts = {
  movingFromEur?: number;
  disposalFromEur?: number;
  montageFromEur?: number;
};

export function Preisbeispiele({
  service = "ALL",
  starts,
}: {
  service?: ServiceFilter;
  starts?: PreisbeispieleStarts;
}) {
  const movingExamples = [...UMZUG_EXAMPLES];
  const disposalExamples = [...ENTSORGUNG_EXAMPLES];
  const montageExamples = [...MONTAGE_EXAMPLES];

  if (starts?.movingFromEur != null) {
    movingExamples[0] = { ...movingExamples[0], minEur: Math.max(0, starts.movingFromEur) };
  }
  if (starts?.disposalFromEur != null) {
    disposalExamples[0] = {
      ...disposalExamples[0],
      minEur: Math.max(0, starts.disposalFromEur),
    };
  }
  if (starts?.montageFromEur != null) {
    montageExamples[0] = {
      ...montageExamples[0],
      minEur: Math.max(0, starts.montageFromEur),
    };
  }

  const sections =
    service === "ALL"
      ? [
          { title: "Umzug", examples: movingExamples, href: "/preise?service=UMZUG" },
          { title: "Entsorgung", examples: disposalExamples, href: "/preise?service=ENTSORGUNG" },
          {
            title: "Montage",
            examples: montageExamples,
            href: "/preise?service=UMZUG&addons=DISMANTLE_ASSEMBLE",
          },
        ]
      : service === "UMZUG"
        ? [{ title: "Umzug", examples: movingExamples, href: "/preise?service=UMZUG" }]
        : service === "ENTSORGUNG"
          ? [
              {
                title: "Entsorgung",
                examples: disposalExamples,
                href: "/preise?service=ENTSORGUNG",
              },
            ]
          : [
              {
                title: "Montage",
                examples: montageExamples,
                href: "/preise?service=UMZUG&addons=DISMANTLE_ASSEMBLE",
              },
            ];

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-b from-[color:var(--surface-soft)] to-[color:var(--surface-elevated)] dark:from-slate-900/50 dark:to-slate-950" />
      <Container className="relative py-16">
        <Reveal>
          <div className="text-center">
            <span className="inline-block rounded-full bg-brand-100/80 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
              Orientierung
            </span>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Preisbeispiele
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
              Typische Szenarien mit realistischen Preisrahmen (brutto, inkl. MwSt.)
            </p>
          </div>
        </Reveal>

        <Reveal className="mt-10">
          <div className="space-y-10">
            {sections.map((section) => (
              <div key={section.title}>
                <h3 className="mb-4 text-lg font-extrabold text-slate-950 dark:text-white">
                  {section.title}
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  {section.examples.map((ex) => (
                    <div
                      key={ex.label}
                      className="rounded-2xl border-2 border-slate-200 bg-[color:var(--surface-elevated)] p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-brand-500/40"
                    >
                      <div className="text-sm font-extrabold text-slate-950 dark:text-white">
                        {ex.label}
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {ex.desc}
                      </p>
                      <div className="mt-4 text-lg font-extrabold text-brand-700 dark:text-brand-400">
                        {eur(ex.minEur)} – {eur(ex.maxEur)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal className="mt-8">
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/80 p-4 text-sm text-slate-700 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-slate-300">
            <strong>Hinweis:</strong> Der Endpreis wird nach Prüfung bestätigt – u. a. abhängig von
            Halteverbotszone, Laufweg, Etagen und tatsächlichem Umfang.
          </div>
        </Reveal>

        {service === "ALL" && (
          <Reveal className="mt-6 text-center">
            <Link href="/preise">
              <Button variant="outline" size="lg" className="gap-2">
                Zum Preisrechner
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Reveal>
        )}
      </Container>
    </section>
  );
}


import Link from "next/link";
import { CheckCircle2, Sparkles } from "lucide-react";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";

type ServiceSlug = "umzug" | "entsorgung" | "montage";

const paketeConfig: Record<
  ServiceSlug,
  { standard: string; plus: string; premium: string }
> = {
  umzug: {
    standard: "/preise?service=UMZUG&speed=ECONOMY",
    plus: "/preise?service=UMZUG&speed=STANDARD",
    premium: "/preise?service=UMZUG&speed=EXPRESS",
  },
  entsorgung: {
    standard: "/preise?service=ENTSORGUNG&speed=ECONOMY",
    plus: "/preise?service=ENTSORGUNG&speed=STANDARD",
    premium: "/preise?service=ENTSORGUNG&speed=EXPRESS",
  },
  montage: {
    standard: "/preise?service=UMZUG&addons=DISMANTLE_ASSEMBLE&speed=ECONOMY",
    plus: "/preise?service=UMZUG&addons=DISMANTLE_ASSEMBLE&speed=STANDARD",
    premium: "/preise?service=UMZUG&addons=DISMANTLE_ASSEMBLE&speed=EXPRESS",
  },
};

const tierBullets: Record<string, string[]> = {
  standard: [
    "Günstigste Option",
    "Flexibles Zeitfenster",
    "Ideal bei planbaren Terminen",
  ],
  plus: [
    "Meistgewählt",
    "Schnelle Rückmeldung",
    "Balance aus Preis und Tempo",
  ],
  premium: [
    "Schnellste Option",
    "Priorisierte Planung",
    "Für dringende Aufträge",
  ],
};

export function PaketeSection({ service }: { service: ServiceSlug }) {
  const urls = paketeConfig[service];

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-b from-[color:var(--surface-elevated)] to-[color:var(--surface-soft)] dark:from-slate-950 dark:to-slate-900/50" />
      <Container className="relative py-20">
        <Reveal>
          <div className="text-center">
            <span className="inline-block rounded-full bg-brand-100/80 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
              Pakete
            </span>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Wählen Sie Ihr Paket
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
              Standard, Plus oder Premium – je nach Dringlichkeit und Budget.
            </p>
          </div>
        </Reveal>

        <Reveal className="mt-10">
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
            {[
              { key: "standard", label: "Standard", url: urls.standard, recommended: false },
              { key: "plus", label: "Plus", url: urls.plus, recommended: true },
              { key: "premium", label: "Premium", url: urls.premium, recommended: false },
            ].map((tier) => (
              <Link
                key={tier.key}
                href={tier.url}
                className={`relative flex flex-col rounded-2xl border-2 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                  tier.recommended
                    ? "border-brand-500 bg-brand-50/70 shadow-md dark:border-brand-500 dark:bg-brand-900/20"
                    : "border-slate-200 bg-[color:var(--surface-elevated)] hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-brand-500/40"
                }`}
              >
                {tier.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white shadow-md">
                    <Sparkles className="h-3 w-3" />
                    Empfohlen
                  </div>
                )}
                <div className="text-lg font-extrabold text-slate-950 dark:text-white">
                  {tier.label}
                </div>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  {tierBullets[tier.key].map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                      {b}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant={tier.recommended ? "primary" : "outline"}
                  className="mt-6 w-full"
                >
                  Angebot berechnen
                </Button>
              </Link>
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

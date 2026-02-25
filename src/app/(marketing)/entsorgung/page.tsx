import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Recycle,
  ShieldCheck,
  Star,
} from "lucide-react";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { PaketeSection } from "@/components/pakete-section";
import { Reveal } from "@/components/motion/reveal";
import { ServiceSchema } from "@/components/schema/service-schema";
import { getImageSlot } from "@/server/content/slots";

export const metadata = {
  title: "Entsorgung / Sperrmüll",
};

const benefits = [
  {
    icon: Recycle,
    title: "Fachgerechte Entsorgung",
    desc: "Sperrmüll, Möbel und Altgeräte werden umweltbewusst entsorgt und recycelt.",
  },
  {
    icon: ShieldCheck,
    title: "Strukturierte Abholung",
    desc: "Klare Angaben, optional mit Fotos – für eine präzise Vorab-Einschätzung.",
  },
  {
    icon: Clock,
    title: "Schnelle Abwicklung",
    desc: "Kurzfristige Termine möglich – wir räumen und entsorgen zügig.",
  },
  {
    icon: MapPin,
    title: "Berlin & deutschlandweit",
    desc: "Ob Einzelabholung oder Entrümpelung – wir sind in Ihrer Nähe.",
  },
];

const steps = [
  { num: 1, title: "Menge beschreiben", desc: "Volumen oder Fotos – wir schätzen schnell und fair." },
  { num: 2, title: "Termin vereinbaren", desc: "Wir melden uns und planen die Abholung." },
  { num: 3, title: "Abholung vor Ort", desc: "Professionell, sauber und umweltbewusst entsorgt." },
];

const trustItems = [
  { icon: Star, text: "5.0 / 5.0 Bewertungen" },
  { icon: ShieldCheck, text: "Versichert" },
  { icon: Clock, text: "Schnelle Rückmeldung" },
  { icon: MapPin, text: "Berlin & deutschlandweit" },
];

export default async function EntsorgungPage() {
  const hero = await getImageSlot({
    key: "img.entsorgung.hero.bg",
    fallbackSrc: "/media/gallery/disposal-dumpster.jpeg",
    fallbackAlt: "Sperrmuell-Container und Abholung",
  });
  return (
    <>
      <ServiceSchema
        name="Entsorgung und Sperrmüllabholung"
        description="Fachgerechte Abholung und Entsorgung von Sperrmüll, Möbeln und Altgeräten."
      />

      {/* Hero */}
      <section className="relative min-h-[56vh] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={hero.src}
            alt="Sperrmüll-Container und Abholung"
            fill
            priority
            className="object-cover hero-bg-image"
            sizes="100vw"
          />
          <div className="hero-overlay-light absolute inset-0 dark:hidden" />
          <div className="hero-overlay-dark absolute inset-0 hidden dark:block" />
        </div>

        <Container className="relative z-10 flex min-h-[56vh] flex-col justify-end pb-14 pt-24 sm:pb-16 sm:pt-28">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/20 px-4 py-1.5 text-xs font-bold text-amber-100 backdrop-blur-sm">
              <Recycle className="h-4 w-4" />
              Fachgerecht & umweltbewusst
            </div>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Entsorgung / Sperrmüll
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-200">
              Sperrmüll, Altgeräte und Entrümpelung – wir holen ab, trennen fachgerecht und
              entsorgen umweltbewusst. Schnelle Rückmeldung und faire Preise.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/entsorgung/buchen">
                <Button size="lg" className="gap-2">
                  <Recycle className="h-5 w-5" />
                  Abholung anfragen
                </Button>
              </Link>
              <Link href="/kontakt">
                <Button size="lg" variant="outline" className="gap-2 border-white/50 bg-white/10 text-white hover:bg-white/20">
                  Kontakt
                </Button>
              </Link>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Trust Row */}
      <section className="border-b border-slate-200 bg-[color:var(--surface-elevated)] py-6 dark:border-slate-800 dark:bg-slate-950">
        <Container>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {trustItems.map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                <item.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                {item.text}
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Benefit Cards */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-[color:var(--surface-soft)] to-[color:var(--surface-elevated)] dark:from-slate-900/50 dark:to-slate-950" />
        <Container className="relative py-20">
          <Reveal>
            <div className="text-center">
              <span className="inline-block rounded-full bg-amber-100/80 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                Ihre Vorteile
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Warum Entsorgung mit uns
              </h2>
            </div>
          </Reveal>

          <Reveal className="mt-12">
            <div className="grid gap-6 sm:grid-cols-2">
              {benefits.map((b) => (
                <div
                  key={b.title}
                  className="rounded-2xl border-2 border-slate-200 bg-[color:var(--surface-elevated)] p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-amber-500/40"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                    <b.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-extrabold text-slate-950 dark:text-white">
                    {b.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{b.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Wichtig */}
          <Reveal className="mt-12">
            <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/80 p-6 dark:border-amber-500/50 dark:bg-amber-950/30">
              <h3 className="text-sm font-extrabold text-amber-800 dark:text-amber-300">
                Wichtig – bitte beachten
              </h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <li>• Keine gefährlichen Stoffe, Chemikalien, Batterien, Reifen oder Sondermüll.</li>
                <li>• Wenn möglich: Trennen Sie Materialarten (Holz, Metall, Elektro).</li>
                <li>• Fotos unterstützen eine präzisere Schätzung (optional).</li>
              </ul>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* So funktioniert's */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-[color:var(--surface-elevated)] to-[color:var(--surface-soft)] dark:from-slate-950 dark:to-slate-900/50" />
        <Container className="relative py-20">
          <Reveal>
            <div className="text-center">
              <span className="inline-block rounded-full bg-amber-100/80 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                Ablauf
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                So funktioniert&apos;s
              </h2>
            </div>
          </Reveal>

          <Reveal className="mt-12">
            <div className="mx-auto grid max-w-3xl gap-8 sm:grid-cols-3">
              {steps.map((s) => (
                <div key={s.num} className="relative text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-amber-600 to-amber-500 text-lg font-extrabold text-white shadow-md dark:from-amber-500 dark:to-amber-400">
                    {s.num}
                  </div>
                  <h3 className="mt-4 text-lg font-extrabold text-slate-950 dark:text-white">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{s.desc}</p>
                  {s.num < 3 && (
                    <div className="absolute top-7 left-[calc(50%+2rem)] hidden h-0.5 w-[calc(100%-4rem)] bg-slate-200 sm:block dark:bg-slate-700" />
                  )}
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal className="mt-12 text-center">
            <Link href="/entsorgung/buchen">
              <Button size="lg" className="gap-2">
                Jetzt Abholung anfragen
                <CheckCircle2 className="h-5 w-5" />
              </Button>
            </Link>
          </Reveal>
        </Container>
      </section>

      <PaketeSection service="entsorgung" />
    </>
  );
}


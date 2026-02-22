import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  Star,
  Wrench,
} from "lucide-react";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { PaketeSection } from "@/components/pakete-section";
import { Reveal } from "@/components/motion/reveal";
import { ServiceSchema } from "@/components/schema/service-schema";
import { getImageSlot } from "@/server/content/slots";

export const metadata = {
  title: "Montage",
};

const benefits = [
  {
    icon: Wrench,
    title: "Professionelle Montage",
    desc: "Möbel fachgerecht abbauen, transportieren und am Zielort wieder aufbauen.",
  },
  {
    icon: ShieldCheck,
    title: "Erfahrene Montage-Teams",
    desc: "Sauber arbeiten, präzise und ohne Beschädigungen – vom Aufbau bis zur Übergabe.",
  },
  {
    icon: Clock,
    title: "Flexible Termine",
    desc: "Kurzfristig oder geplant – wir finden den passenden Termin für Ihre Montage.",
  },
  {
    icon: MapPin,
    title: "Berlin & deutschlandweit",
    desc: "Montage bei Ihnen vor Ort – deutschlandweit im Einsatz.",
  },
];

const steps = [
  { num: 1, title: "Montage beschreiben", desc: "Anzahl und Art der Möbel – wir kalkulieren fair." },
  { num: 2, title: "Angebot erhalten", desc: "Schnelle Rückmeldung mit transparentem Preis." },
  { num: 3, title: "Montage durchführen", desc: "Unser Team kommt pünktlich und arbeitet zuverlässig." },
];

const trustItems = [
  { icon: Star, text: "5.0 / 5.0 Bewertungen" },
  { icon: ShieldCheck, text: "Versichert" },
  { icon: Clock, text: "Schnelle Rückmeldung" },
  { icon: MapPin, text: "Berlin & deutschlandweit" },
];

export default async function MontagePage() {
  const hero = await getImageSlot({
    key: "img.montage.hero.bg",
    fallbackSrc: "/media/gallery/workshop.jpeg",
    fallbackAlt: "Moebelmontage und Aufbau",
  });
  return (
    <>
      <ServiceSchema
        name="Möbelmontage und Aufbauservice"
        description="Professioneller Aufbau- und Abbau-Service für Möbel – sauber, schnell und zuverlässig."
      />

      {/* Hero */}
      <section className="relative min-h-[50vh] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={hero.src}
            alt="Möbelmontage und Aufbau"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/50 to-slate-950/30" />
        </div>

        <Container className="relative z-10 flex min-h-[50vh] flex-col justify-end pb-16 pt-28">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/40 bg-brand-500/20 px-4 py-1.5 text-xs font-bold text-brand-100 backdrop-blur-sm">
              <Wrench className="h-4 w-4" />
              Möbelmontage & Aufbau
            </div>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Montage
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-200">
              Möbel ab- und aufbauen, sauber und mit Präzision. Ob Umzugsmontage oder
              Einzelaufbau – wir erledigen es professionell.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/preise?service=UMZUG&addons=DISMANTLE_ASSEMBLE">
                <Button size="lg" className="gap-2">
                  <Wrench className="h-5 w-5" />
                  Montage anfragen
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
                <item.icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
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
              <span className="inline-block rounded-full bg-brand-100/80 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                Ihre Vorteile
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Warum Montage mit uns
              </h2>
            </div>
          </Reveal>

          <Reveal className="mt-12">
            <div className="grid gap-6 sm:grid-cols-2">
              {benefits.map((b) => (
                <div
                  key={b.title}
                  className="rounded-2xl border-2 border-slate-200 bg-[color:var(--surface-elevated)] p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-brand-500/40"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400">
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
        </Container>
      </section>

      {/* So funktioniert's */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-[color:var(--surface-elevated)] to-[color:var(--surface-soft)] dark:from-slate-950 dark:to-slate-900/50" />
        <Container className="relative py-20">
          <Reveal>
            <div className="text-center">
              <span className="inline-block rounded-full bg-brand-100/80 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
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
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-brand-600 to-brand-500 text-lg font-extrabold text-white shadow-md dark:from-brand-500 dark:to-brand-400">
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
            <Link href="/preise?service=UMZUG&addons=DISMANTLE_ASSEMBLE">
              <Button size="lg" className="gap-2">
                Jetzt Montage anfragen
                <CheckCircle2 className="h-5 w-5" />
              </Button>
            </Link>
          </Reveal>
        </Container>
      </section>

      <PaketeSection service="montage" />
    </>
  );
}

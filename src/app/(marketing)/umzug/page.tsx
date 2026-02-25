import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  Star,
  Truck,
  Wrench,
} from "lucide-react";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { PaketeSection } from "@/components/pakete-section";
import { Reveal } from "@/components/motion/reveal";
import { ServiceSchema } from "@/components/schema/service-schema";
import { getImageSlot } from "@/server/content/slots";

export const metadata = {
  title: "Umzug",
};

const benefits = [
  {
    icon: Truck,
    title: "Transport & Schutz",
    desc: "Pünktliche Teams, sichere Verpackung und saubere Organisation von A bis Z.",
  },
  {
    icon: Wrench,
    title: "Montage & Demontage",
    desc: "Möbel fachgerecht abbauen, transportieren und am Zielort wieder aufbauen.",
  },
  {
    icon: ShieldCheck,
    title: "Versichert & zuverlässig",
    desc: "Vollständige Haftung und professionelle Abwicklung für Ihren ruhigen Umzug.",
  },
  {
    icon: Clock,
    title: "Flexible Terminplanung",
    desc: "Kurzfristig oder geplant – wir finden gemeinsam den passenden Termin.",
  },
  {
    icon: MapPin,
    title: "Deutschlandweit",
    desc: "Berlin, Hamburg, München und in ganz Deutschland – wir sind für Sie da.",
  },
];

const steps = [
  { num: 1, title: "Anfrage senden", desc: "Online oder per Telefon – beschreiben Sie Ihren Umzug." },
  { num: 2, title: "Angebot prüfen", desc: "Wir kalkulieren transparent und melden uns schnell." },
  { num: 3, title: "Termin durchführen", desc: "Unser Team kommt pünktlich und arbeitet zuverlässig." },
];

const trustItems = [
  { icon: Star, text: "5.0 / 5.0 Bewertungen" },
  { icon: ShieldCheck, text: "Voll versichert" },
  { icon: Clock, text: "Schnelle Rückmeldung" },
  { icon: MapPin, text: "Berlin & deutschlandweit" },
];

export default async function UmzugPage() {
  const hero = await getImageSlot({
    key: "img.umzug.hero.bg",
    fallbackSrc: "/media/gallery/truck-street.jpeg",
    fallbackAlt: "Umzugstransporter unterwegs",
  });
  return (
    <>
      <ServiceSchema
        name="Umzugsservice Deutschland"
        description="Professioneller Umzugsservice für Privat und Gewerbe mit Planung, Transport und Montage."
      />

      {/* Hero */}
      <section className="relative min-h-[56vh] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={hero.src}
            alt={hero.alt || "Umzugstransporter unterwegs"}
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
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/40 bg-brand-500/20 px-4 py-1.5 text-xs font-bold text-brand-100 backdrop-blur-sm">
              <ShieldCheck className="h-4 w-4" />
              Professioneller Umzugsservice
            </div>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Umzug deutschlandweit
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-200">
              Stressfrei umziehen mit erfahrenen Profis. Wir kümmern uns um Planung, Transport
              und sichere Durchführung – von der ersten Anfrage bis zur Übergabe.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/buchen?context=MOVING">
                <Button size="lg" className="gap-2">
                  <Truck className="h-5 w-5" />
                  Angebot berechnen
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
                Warum Sie mit uns umziehen
              </h2>
            </div>
          </Reveal>

          <Reveal className="mt-12">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.slice(0, 3).map((b) => (
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
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {benefits.slice(3).map((b) => (
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
            <Link href="/buchen?context=MOVING">
              <Button size="lg" className="gap-2">
                Jetzt Angebot anfordern
                <CheckCircle2 className="h-5 w-5" />
              </Button>
            </Link>
          </Reveal>
        </Container>
      </section>

      <PaketeSection service="umzug" />
    </>
  );
}


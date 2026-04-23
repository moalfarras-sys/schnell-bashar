import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageCircle, Phone, Recycle, ShieldCheck, Truck, Wrench } from "lucide-react";

import { Container } from "@/components/container";
import { MovingFAQSection } from "@/components/sections/moving-faq";
import { QuickEstimateWidget } from "@/components/quick-estimate-widget";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Umzugsunternehmen Berlin | Umzug, Entsorgung & Montage 24/7",
  description:
    "Schnell Sicher Umzug in Berlin: Umzug, Entsorgung und Möbelmontage 24/7 erreichbar. Transparente Preise, schnelle Termine und professionelle Durchführung.",
  alternates: {
    canonical: "/",
  },
};

const services = [
  {
    title: "Umzug Berlin & deutschlandweit",
    text: "Privat- und Firmenumzug mit Planung, Transport, Trageleistung und optionaler Montage.",
    href: "/umzug",
    icon: Truck,
  },
  {
    title: "Sperrmüll / Entsorgung",
    text: "Fachgerechte Abholung von Möbeln, Altgeräten und Sperrmüll mit klarer Preisorientierung.",
    href: "/entsorgung",
    icon: Recycle,
  },
  {
    title: "Möbelmontage / Küchenmontage",
    text: "Aufbau, Abbau und Anschlussarbeiten für Möbel, Küche und ausgewählte Geräte.",
    href: "/montage",
    icon: Wrench,
  },
];

const trustBlocks = [
  "Transparente Preisorientierung",
  "Strukturierte Planung",
  "Sorgfältiger Möbeltransport",
  "Persönliche Beratung",
  "Fachgerechte Entsorgung",
  "24/7 erreichbar",
];

const processSteps = [
  { title: "Leistung auswählen", text: "Umzug, Entsorgung, Montage oder Kombi-Service anfragen." },
  { title: "Details senden", text: "Adresse, Umfang, Wunschzeitraum und Besonderheiten übermitteln." },
  { title: "Angebot erhalten", text: "Unser Team prüft die Angaben und erstellt ein passendes Angebot." },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,136,240,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.14),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#eef5fb_100%)] dark:bg-[linear-gradient(180deg,#0f172a_0%,#020617_100%)]" />
        <Container className="relative py-20 sm:py-24 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:items-center">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-4 py-1.5 text-xs font-bold text-brand-700 shadow-sm">
                <CheckCircle2 className="h-4 w-4" />
                24/7 erreichbar • Berlin & deutschlandweit
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Umzugsunternehmen Berlin – Umzug, Entsorgung & Montage 24/7
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-700 sm:text-lg">
                Schnell Sicher Umzug unterstützt private und gewerbliche Kunden in Berlin und
                deutschlandweit bei Umzug, Sperrmüll-Entsorgung, Möbelmontage und strukturierten
                Online-Anfragen. Telefonisch rund um die Uhr erreichbar, Termine nach Vereinbarung.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/booking">
                  <Button size="xl" className="gap-2">
                    Kostenloses Angebot anfragen
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="https://wa.me/491729573681" target="_blank" rel="noopener noreferrer">
                  <Button size="xl" variant="outline" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Jetzt per WhatsApp schreiben
                  </Button>
                </a>
                <a
                  href="tel:+491729573681"
                  aria-label="Direkt anrufen unter +49 172 9573681"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.60)] bg-[rgba(255,255,255,0.55)] px-8 text-base font-bold text-slate-900 shadow-[0_0_0_0.5px_rgba(10,16,32,0.04),0_2px_8px_rgba(10,16,32,0.04),inset_0_1px_0_rgba(255,255,255,0.70)] backdrop-blur-md transition-all duration-220 ease-premium hover:-translate-y-px hover:bg-[rgba(255,255,255,0.75)] hover:shadow-[0_0_0_0.5px_rgba(10,16,32,0.05),0_4px_14px_rgba(10,16,32,0.06),inset_0_1px_0_rgba(255,255,255,0.80)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-brand-500/50 dark:hover:bg-slate-800/90 dark:hover:shadow-[0_0_24px_rgba(59,130,246,0.12)] dark:focus-visible:ring-brand-500/30 sm:text-lg"
                >
                  <Phone className="h-4 w-4" />
                  Direkt anrufen
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-6 top-6 h-28 w-28 rounded-full bg-brand-200/40 blur-3xl" />
              <div className="absolute -bottom-8 right-0 h-36 w-36 rounded-full bg-sky-300/30 blur-3xl" />
              <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/70 p-2 shadow-[0_30px_90px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-slate-200">
                  <Image
                    src="/media/gallery/truck-road.jpeg"
                    alt="Umzugslastwagen von Schnell Sicher Umzug auf dem Weg zum Einsatz"
                    fill
                    priority
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-950/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-100/90 backdrop-blur">
                      Schnell Sicher Umzug
                    </div>
                    <div className="mt-4 max-w-xs text-2xl font-extrabold leading-tight">
                      Strukturierte Umzüge mit moderner Anfrage und klarer Abstimmung.
                    </div>
                    <div className="mt-3 text-sm leading-relaxed text-slate-100/85">
                      Berlin, Umland und deutschlandweite Einsätze mit telefonischer Erreichbarkeit
                      rund um die Uhr.
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 rounded-[24px] bg-slate-950 px-4 py-4 text-white sm:grid-cols-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Einsatzgebiet</div>
                    <div className="mt-1 text-sm font-semibold">Berlin & deutschlandweit</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Erreichbarkeit</div>
                    <div className="mt-1 text-sm font-semibold">24/7 telefonisch</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Ablauf</div>
                    <div className="mt-1 text-sm font-semibold">Anfrage, Prüfung, Angebot</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <QuickEstimateWidget />

      <section className="py-20">
        <Container>
          <div className="text-center">
            <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
              Leistungen
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Leistungen für Berlin und ganz Deutschland
            </h2>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {services.map((service) => (
              <Link
                key={service.title}
                href={service.href}
                className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <service.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-extrabold text-slate-950">{service.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{service.text}</p>
                <div className="mt-5 text-sm font-bold text-brand-700">Mehr erfahren</div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-slate-50 py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
                Warum Schnell Sicher Umzug?
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                Seriös, strukturiert und auf klare Abläufe ausgelegt
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                Die Website und das Anfrage-System sind auf professionelle Kundenkommunikation,
                saubere Angebotsprüfung und nachvollziehbare Dokumente ausgelegt. Keine
                Sofort-Unterschrift direkt nach dem Formular, sondern administrative Prüfung vor
                jedem Vertragsversand.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {trustBlocks.map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700 shadow-sm">
                  <ShieldCheck className="mb-3 h-5 w-5 text-brand-700" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <div className="text-center">
            <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
              Ablauf
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              So läuft Ihre Anfrage ab
            </h2>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {processSteps.map((step, index) => (
              <div key={step.title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-lg font-extrabold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-5 text-xl font-extrabold text-slate-950">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <MovingFAQSection />

      <section className="bg-slate-950 py-20 text-white">
        <Container>
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Kontakt und Buchung</h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">
                Für Umzug Berlin, Sperrmüll Entsorgung Berlin oder Möbelmontage Berlin können Sie
                direkt online anfragen. Alternativ sind wir per Telefon und WhatsApp erreichbar.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Link href="/preise">
                <Button size="lg" variant="outline-light">
                  Preise ansehen
                </Button>
              </Link>
              <Link href="/booking">
                <Button size="lg">Termin online buchen</Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

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
              <a href="tel:+491729573681">
                <Button size="xl" variant="outline" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Direkt anrufen
                </Button>
              </a>
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
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Kontakt und Buchung
              </h2>
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

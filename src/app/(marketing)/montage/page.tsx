import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Phone, Wrench } from "lucide-react";

import { Container } from "@/components/container";
import { PaketeSection } from "@/components/pakete-section";
import { Preisbeispiele } from "@/components/preisbeispiele";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Möbelmontage Berlin | Küchenmontage, Schrankaufbau & Geräteanschluss",
  description:
    "Professionelle Möbelmontage in Berlin: Küche, Schrank, Bett, Regal, TV-Wandhalterung und Geräteanschluss. 24/7 erreichbar und flexibel buchbar.",
  alternates: { canonical: "/montage" },
};

const included = ["Möbelaufbau und Demontage", "Küchen- und Schrankmontage", "Vor-Ort-Prüfung der Angaben", "Ergänzung zu Umzug oder Einzelauftrag"];
const priceFactors = ["Anzahl und Art der Möbel", "Zeitaufwand und Sondermontagen", "Geräteanschlüsse oder Zusatzmaterial", "Kombination mit Umzug oder Entsorgung"];
const faq = [
  ["Kann Montage mit Umzug kombiniert werden?", "Ja. Montage kann als Zusatzleistung gemeinsam mit Umzug oder separat angefragt werden."],
  ["Sind Küchenmontagen möglich?", "Ja. Küchenmontage und ausgewählte Anschlussarbeiten sind Bestandteil des Leistungsangebots."],
  ["Wird direkt ein Vertrag freigeschaltet?", "Nein. Zunächst prüft unser Team die Angaben und erstellt das passende Angebot."],
];

export default function MontagePage() {
  return (
    <div className="bg-white">
      <section className="bg-slate-950 py-20 text-white">
        <Container>
          <div className="max-w-4xl">
            <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-bold">Möbelmontage Berlin</span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">Küchenmontage, Schrankaufbau und Möbelservice</h1>
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300">
              Schnell Sicher Umzug unterstützt bei Möbelmontage, Küchenmontage und ausgewählten
              Geräteanschlüssen in Berlin und deutschlandweit. Die Anfrage bleibt zunächst eine
              Prüfung und wird nicht automatisch zu einem unterschriftsreifen Vertrag.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/booking"><Button size="lg">Möbelmontage Berlin buchen</Button></Link>
              <Link href="/preise"><Button size="lg" variant="outline-light">Preise ansehen</Button></Link>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 p-7 shadow-sm">
            <h2 className="text-2xl font-extrabold text-slate-950">Was ist enthalten?</h2>
            <ul className="mt-5 grid gap-3">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-brand-700" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-200 p-7 shadow-sm">
            <h2 className="text-2xl font-extrabold text-slate-950">Was beeinflusst den Preis?</h2>
            <ul className="mt-5 grid gap-3">
              {priceFactors.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                  <Wrench className="mt-0.5 h-5 w-5 text-brand-700" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section className="bg-slate-50 py-16">
        <Container>
          <h2 className="text-2xl font-extrabold text-slate-950">Ablauf der Montageanfrage</h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {["Leistung und Umfang senden", "Prüfung und Angebot erhalten", "Termin abstimmen und durchführen"].map((step, index) => (
              <div key={step} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 font-bold text-white">{index + 1}</div>
                <p className="mt-4 text-sm font-semibold text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Preisbeispiele service="MONTAGE" />
      <PaketeSection service="montage" />

      <section className="py-16">
        <Container>
          <h2 className="text-2xl font-extrabold text-slate-950">Häufige Fragen zur Montage</h2>
          <div className="mt-8 grid gap-4">
            {faq.map(([question, answer]) => (
              <div key={question} className="rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-950">{question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{answer}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/umzug"><Button variant="outline">Umzug ergänzen</Button></Link>
            <Link href="/booking"><Button className="gap-2">Kostenloses Angebot anfragen <ArrowRight className="h-4 w-4" /></Button></Link>
            <a
              href="tel:+491729573681"
              aria-label="Direkt anrufen unter +49 172 9573681"
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-[rgba(255,255,255,0.60)] bg-[rgba(255,255,255,0.55)] px-5 text-sm font-bold text-slate-900 shadow-[0_0_0_0.5px_rgba(10,16,32,0.04),0_2px_8px_rgba(10,16,32,0.04),inset_0_1px_0_rgba(255,255,255,0.70)] backdrop-blur-md transition-all duration-220 ease-premium hover:-translate-y-px hover:bg-[rgba(255,255,255,0.75)] hover:shadow-[0_0_0_0.5px_rgba(10,16,32,0.05),0_4px_14px_rgba(10,16,32,0.06),inset_0_1px_0_rgba(255,255,255,0.80)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-brand-500/50 dark:hover:bg-slate-800/90 dark:hover:shadow-[0_0_24px_rgba(59,130,246,0.12)]"
            >
              <Phone className="h-4 w-4" />
              Direkt anrufen
            </a>
          </div>
        </Container>
      </section>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, Recycle, Truck, Wrench } from "lucide-react";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Tipps & Blog",
};

const articles = [
  {
    title: "Umzug vorbereiten: Checkliste für 30 Tage",
    teaser:
      "So planen Sie Ihren Umzug stressfrei: Fristen, Kartons, Adressänderungen und Terminabstimmung.",
    topic: "Umzug",
    icon: Truck,
  },
  {
    title: "Sperrmüll richtig trennen und Kosten sparen",
    teaser:
      "Welche Materialien gehören zusammen, was ist ausgeschlossen und wie Sie die Abholung effizient vorbereiten.",
    topic: "Entsorgung",
    icon: Recycle,
  },
  {
    title: "Möbelmontage ohne Schäden: Die 7 wichtigsten Punkte",
    teaser:
      "Werkzeug, Schutzflächen, Reihenfolge beim Aufbau und sichere Montage von Küche, Schrank und Geräten.",
    topic: "Montage",
    icon: Wrench,
  },
];

export default function TippsPage() {
  return (
    <Container className="py-14">
      <section className="rounded-3xl border border-[color:var(--line-soft)] bg-[color:var(--surface-elevated)] p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
          Tipps & Blog
        </h1>
        <p className="mt-4 max-w-3xl text-sm text-slate-700 dark:text-slate-300">
          Praxisnahe Hinweise zu Umzug, Entsorgung und Montage. Alle Inhalte sind auf
          den Alltag in Deutschland ausgerichtet und werden fortlaufend erweitert.
        </p>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-3">
        {articles.map((a) => (
          <article
            key={a.title}
            className="rounded-2xl border border-[color:var(--line-soft)] bg-[color:var(--surface-elevated)] p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
              <a.icon className="h-3.5 w-3.5" />
              {a.topic}
            </div>
            <h2 className="mt-3 text-lg font-extrabold text-slate-900 dark:text-white">{a.title}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{a.teaser}</p>
            <div className="mt-4 text-sm font-semibold text-brand-600 dark:text-brand-400">
              Artikel in Vorbereitung
            </div>
          </article>
        ))}
      </section>

      <section className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/booking?context=MOVING">
          <Button className="gap-2">
            Jetzt Anfrage starten
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/faq">
          <Button variant="outline">Zur FAQ</Button>
        </Link>
      </section>
    </Container>
  );
}




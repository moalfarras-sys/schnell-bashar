import Link from "next/link";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { FaqSchema } from "@/components/schema/faq-schema";

export const metadata = {
  title: "FAQ | Fragen zu Umzug, Entsorgung & Montage in Berlin",
  description:
    "Antworten auf häufige Fragen zu Umzug, Sperrmüll, Entsorgung, Möbelmontage, Preisen, Terminen und Buchung bei Schnell Sicher Umzug.",
  alternates: {
    canonical: "/faq",
  },
};

const faqItems = [
  {
    q: "Welche Leistungen bietet Schnell Sicher Umzug?",
    a: "Wir bieten Umzug, Montage, Entrümpelung sowie fachgerechte Entsorgung und Sperrmüll-Abholung.",
  },
  {
    q: "Wie schnell bekomme ich ein Angebot?",
    a: "Ein Anruf genügt – in der Regel erhalten Sie sehr schnell eine Rückmeldung. Alternativ können Sie online direkt anfragen.",
  },
  {
    q: "Kann ich ohne lange Texte buchen?",
    a: "Ja. In unserem Buchungsformular wählen Sie strukturierte Optionen aus. Freitext ist nur optional.",
  },
  {
    q: "Welche Materialien sind bei Entsorgung ausgeschlossen?",
    a: "Gefährliche Stoffe, Chemikalien, Batterien, Reifen und sonstiger Sondermüll sind ausgeschlossen.",
  },
  {
    q: "In welchen Regionen sind Sie aktiv?",
    a: "Wir planen Einsätze deutschlandweit. Details stimmen wir anhand Ihrer Anfrage ab.",
  },
  {
    q: "Wie kann ich Sie kontaktieren?",
    a: "Telefonisch unter +49 172 9573681, per E-Mail an kontakt@schnellsicherumzug.de oder direkt über WhatsApp. Telefonisch sind wir 24/7 erreichbar.",
  },
];

export default function FaqPage() {
  return (
    <Container className="py-14">
      <FaqSchema items={faqItems} />
      <div className="max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
          Häufige Fragen (FAQ)
        </h1>
        <p className="mt-4 text-base text-slate-800 dark:text-slate-200">
          Antworten auf die wichtigsten Fragen rund um Umzug, Entsorgung, Preise und Kontakt.
        </p>
      </div>

      <div className="mt-10 grid gap-4">
        {faqItems.map((item) => (
          <details key={item.q} className="premium-surface-emphasis rounded-2xl border-2 border-slate-300 p-5 shadow-sm dark:border-slate-700">
            <summary className="cursor-pointer list-none text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {item.q}
            </summary>
            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{item.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/preise">
          <Button size="lg">Preise ansehen</Button>
        </Link>
        <Link href="/kontakt">
          <Button size="lg" variant="outline">
            Kontakt aufnehmen
          </Button>
        </Link>
      </div>
    </Container>
  );
}

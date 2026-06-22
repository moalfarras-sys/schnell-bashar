import { DocumentFooter } from "@/components/document/DocumentFooter";
import type { Company } from "@/types/document";

const terms = [
  {
    title: "1. Leistungsumfang",
    body: "Maßgeblich sind die im Angebot oder Vertrag schriftlich vereinbarten Leistungen. Zusätzliche Arbeiten werden nur nach Absprache ausgeführt und separat berechnet."
  },
  {
    title: "2. Mitwirkung des Kunden",
    body: "Der Kunde sorgt für freie Zugänge, gepackte Kartons, korrekte Adressdaten und rechtzeitige Hinweise zu Ladewegen, Etagen, Fahrstuhl, Halteverbotszonen und besonderen Gegenständen."
  },
  {
    title: "3. Zusatzkosten",
    body: "Nicht vereinbarte Wartezeiten, zusätzliche Ladewege, Montagearbeiten, Verpackung, Entsorgung oder weitere Fahrten können nach Aufwand berechnet werden."
  },
  {
    title: "4. Zahlung",
    body: "Zahlungen sind gemäß Rechnung und Zahlungshinweis fällig. Bei Zahlungsverzug bleiben weitergehende Ansprüche vorbehalten."
  },
  {
    title: "5. Haftung und Schäden",
    body: "Offensichtliche Schäden sind bei Abnahme schriftlich zu dokumentieren. Haftung besteht im gesetzlichen Rahmen und nur für vereinbarte Transportleistungen."
  },
  {
    title: "6. Stornierung",
    body: "Stornierungen müssen schriftlich erfolgen. Bereits entstandene Kosten, reservierte Zeiten und beauftragte Fremdleistungen können berechnet werden."
  },
  {
    title: "7. Schlussbestimmungen",
    body: "Änderungen und Ergänzungen bedürfen der Textform. Sollte eine Bestimmung unwirksam sein, bleiben die übrigen Bestimmungen wirksam."
  }
];

export function AgbPage({ company }: { company: Company }) {
  return (
    <article className="a4-page flex flex-col p-[15mm] text-[12px] font-medium leading-5 text-slate-950">
      <header
        style={{ borderColor: company.brand.primaryColor }}
        className="print-section flex items-start justify-between border-b-[3px] pb-4"
      >
        <div>
          <p className="text-[22px] font-black">{company.displayName}</p>
          <p className="font-semibold">{company.fullLegalLine}</p>
          <p className="font-semibold">
            Allgemeine Geschäftsbedingungen und Hinweise
          </p>
        </div>
        <div className="text-right text-[11px] font-semibold leading-4">
          <p>{company.street}</p>
          <p>
            {company.postalCode} {company.city}
          </p>
          <p>{company.email}</p>
          <p>{company.website}</p>
        </div>
      </header>

      <main className="mt-5 grid gap-3">
        <p className="rounded-sm border border-slate-500 bg-slate-100 p-3 font-semibold">
          Diese Seite ist als sauber druckbarer Platzhalter für die finalen AGB
          vorbereitet. Vor produktiver Nutzung sollte der endgültige Text
          rechtlich geprüft und hier eingesetzt werden.
        </p>
        {terms.map((term) => (
          <section key={term.title} className="print-section">
            <h2 className="text-[13px] font-black">{term.title}</h2>
            <p className="mt-0.5">{term.body}</p>
          </section>
        ))}
      </main>

      <DocumentFooter company={company} />
    </article>
  );
}

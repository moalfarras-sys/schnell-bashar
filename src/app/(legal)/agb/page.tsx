import { Container } from "@/components/container";

export const metadata = {
  title: "AGB",
};

export default function AgbPage() {
  return (
    <Container className="prose prose-slate dark:prose-invert max-w-3xl py-14">
      <h1>Allgemeine Geschäftsbedingungen (AGB)</h1>

      <p>
        Diese AGB gelten für sämtliche Leistungen von Schnell Sicher Umzug (Umzug, Montage,
        Entsorgung und verwandte Dienstleistungen). Bitte lesen Sie diese Hinweise sorgfältig.
      </p>

      <h2>1. Angebot & Vertrag</h2>
      <p>
        Online-Schätzungen dienen als unverbindliche Orientierung. Ein verbindlicher Vertrag kommt
        erst nach Bestätigung durch Schnell Sicher Umzug zustande.
      </p>

      <h2>2. Termine</h2>
      <p>
        Die Terminwahl im Kalender stellt eine Reservierungsanfrage dar. Termine können abhängig von
        Kapazitäten, Verkehr, Witterung und logistischen Bedingungen angepasst werden.
      </p>

      <h2>3. Preise</h2>
      <p>
        Der angezeigte Preisrahmen basiert auf den gewählten Angaben (m³, Zugang, Zusatzleistungen
        etc.). Der finale Preis wird nach Prüfung bestätigt.
      </p>

      <h2>4. Entsorgung — ausgeschlossene Materialien</h2>
      <p>
        Von der Entsorgung ausgeschlossen sind insbesondere gefährliche Stoffe, Chemikalien,
        Batterien, Reifen, Sondermüll und bau-/schadstoffhaltige Abfälle. Bei Unklarheiten nehmen
        Sie bitte Kontakt mit uns auf.
      </p>

      <h2>5. Mitwirkungspflichten</h2>
      <p>
        Bitte sorgen Sie für Zugang, ggf. erforderliche Genehmigungen (z. B. Halteverbotszone) und
        sichere Wege. Zerbrechliche oder besonders wertvolle Gegenstände sollten entsprechend
        gekennzeichnet werden.
      </p>

      <h2>6. Stornierung</h2>
      <p>
        Stornierungen/Änderungen sind so früh wie möglich mitzuteilen. Je nach Zeitpunkt können
        Kosten entstehen.
      </p>

      <p className="text-sm text-slate-500">
        Hinweis: Diese AGB-Seite ist eine Vorlage. Für eine rechtssichere Fassung empfehlen wir eine
        Prüfung durch eine juristische Fachperson.
      </p>
    </Container>
  );
}




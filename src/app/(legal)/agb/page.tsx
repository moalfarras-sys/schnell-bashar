import { Container } from "@/components/container";

export const metadata = {
  title: "AGB | Schnell Sicher Umzug",
  description: "Allgemeine Geschäftsbedingungen von Schnell Sicher Umzug für Umzug, Entsorgung und Montage.",
};

export default function AgbPage() {
  return (
    <Container className="prose prose-slate max-w-3xl py-14 dark:prose-invert">
      <h1>Allgemeine Geschäftsbedingungen (AGB)</h1>

      <p>
        Diese AGB gelten für Leistungen von Schnell Sicher Umzug in den Bereichen Umzug,
        Entsorgung, Montage sowie damit verbundene Zusatzleistungen.
      </p>

      <h2>1. Anfrage, Angebot und Vertrag</h2>
      <p>
        Online-Rechner, Preisbeispiele und Formularangaben dienen zunächst als unverbindliche
        Anfrage oder Preisorientierung. Ein verbindlicher Vertrag kommt erst zustande, wenn Schnell
        Sicher Umzug die Leistungen prüft und ein Angebot oder einen Auftrag ausdrücklich freigibt.
      </p>

      <h2>2. Leistungsumfang</h2>
      <p>
        Der konkrete Leistungsumfang ergibt sich aus dem abgestimmten Angebot, Auftrag oder der
        Rechnung. Änderungen des Umfangs können zu einer Anpassung von Preis und Termin führen.
      </p>

      <h2>3. Termine und Mitwirkungspflichten</h2>
      <p>
        Kundinnen und Kunden stellen sicher, dass Zugänge, Informationen und gegebenenfalls
        erforderliche Genehmigungen rechtzeitig vorliegen. Termine stehen unter dem Vorbehalt
        operativer Verfügbarkeit und können bei sachlichem Grund angepasst werden.
      </p>

      <h2>4. Preise und Zahlung</h2>
      <p>
        Preise werden auf Basis der gemeldeten Angaben kalkuliert. Zusätzlicher Aufwand, der bei
        Prüfung oder vor Ort erkennbar wird, kann zu einer Anpassung führen. Zahlungsfristen werden
        im jeweiligen Dokument ausgewiesen.
      </p>

      <h2>5. Entsorgung und ausgeschlossene Stoffe</h2>
      <p>
        Sondermüll, gefährliche Stoffe, Chemikalien, Batterien, Reifen und sonstige nicht
        zugelassene Materialien sind von der Entsorgung ausgeschlossen, sofern nicht ausdrücklich
        etwas anderes vereinbart wurde.
      </p>

      <h2>6. Elektronische Bestätigung</h2>
      <p>
        Eine elektronische Bestätigung oder einfache elektronische Unterschrift wird erst nach
        interner Prüfung und ausdrücklicher Freigabe eines konkreten Dokuments ermöglicht.
      </p>

      <h2>7. Änderungen und Stornierungen</h2>
      <p>
        Änderungen oder Stornierungen sind so früh wie möglich mitzuteilen. Bereits reservierte
        Ressourcen oder angefallene Aufwände können gesondert berücksichtigt werden.
      </p>
    </Container>
  );
}

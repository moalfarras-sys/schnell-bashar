import { Container } from "@/components/container";

export const metadata = {
  title: "Datenschutzerklärung | Schnell Sicher Umzug",
  description: "Datenschutzerklärung von Schnell Sicher Umzug mit Informationen zur Verarbeitung personenbezogener Daten.",
};

export default function DatenschutzPage() {
  return (
    <Container className="prose prose-slate max-w-3xl py-14 dark:prose-invert">
      <h1>Datenschutzerklärung</h1>

      <h2>1. Verantwortlicher</h2>
      <p>
        Schnell Sicher Umzug
        <br />
        Inhaber: Baschar Al Hasan
        <br />
        Anzengruber Straße 9
        <br />
        12043 Berlin
        <br />
        Telefon: +49 172 9573681
        <br />
        E-Mail: kontakt@schnellsicherumzug.de
      </p>

      <h2>2. Verarbeitete Daten</h2>
      <p>
        Wir verarbeiten personenbezogene Daten, die Sie uns über Kontaktformulare, Buchungs- und
        Anfrageformulare, E-Mail, Telefon oder WhatsApp mitteilen. Dazu gehören insbesondere Name,
        E-Mail-Adresse, Telefonnummer, Adressdaten, Leistungsdaten und weitere Angaben zur Planung
        Ihres Auftrags.
      </p>

      <h2>3. Zwecke der Verarbeitung</h2>
      <p>
        Die Datenverarbeitung erfolgt zur Bearbeitung von Anfragen, Angebots- und Auftragsprüfung,
        Terminabstimmung, Durchführung von Leistungen, Rechnungserstellung, Anfrageverfolgung,
        Dokumentenerstellung sowie zur Bearbeitung elektronischer Bestätigungen.
      </p>

      <h2>4. Rechtsgrundlagen</h2>
      <p>
        Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO zur Durchführung
        vorvertraglicher Maßnahmen und Verträge sowie, soweit erforderlich, nach Art. 6 Abs. 1 lit.
        f DSGVO für die sichere Bereitstellung und Administration des Online-Systems.
      </p>

      <h2>5. Server-Logs und technische Daten</h2>
      <p>
        Beim Aufruf der Website können technisch erforderliche Logdaten verarbeitet werden. Dazu
        gehören insbesondere IP-Adresse, Datum, Uhrzeit, User-Agent und angeforderte Inhalte, soweit
        dies für den sicheren Betrieb erforderlich ist.
      </p>

      <h2>6. Dokumente, PDFs und elektronische Bestätigung</h2>
      <p>
        Im Rahmen von Angeboten, Aufträgen, Rechnungen und elektronischen Bestätigungen können
        Dokumente mit personenbezogenen Daten gespeichert und verarbeitet werden. Bei einer
        elektronischen Bestätigung können zusätzlich Zeitstempel, IP-Adresse, User-Agent und die
        freigegebene Dokumentenversion verarbeitet werden.
      </p>

      <h2>7. Empfänger und eingesetzte Dienste</h2>
      <p>
        Soweit für Betrieb und Speicherung erforderlich, können technische Dienstleister für Hosting,
        Datenbank, E-Mail oder Dateispeicherung eingebunden sein. Eine Weitergabe erfolgt nur im
        erforderlichen Umfang.
      </p>

      <h2>8. Speicherdauer</h2>
      <p>
        Daten werden nur so lange gespeichert, wie es für Anfragebearbeitung, Vertragsabwicklung,
        Dokumentation oder gesetzliche Aufbewahrungspflichten erforderlich ist.
      </p>

      <h2>9. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
        Datenübertragbarkeit sowie auf Widerspruch nach Maßgabe der gesetzlichen Vorgaben.
      </p>

      <h2>10. Cookies und Analyse</h2>
      <p>
        Diese Erklärung deckt nur technisch erforderliche Vorgänge ab. Falls künftig weitere
        Tracking- oder Analysewerkzeuge eingesetzt werden, ist eine gesonderte rechtliche Prüfung
        und gegebenenfalls Anpassung erforderlich.
      </p>
    </Container>
  );
}

import { Container } from "@/components/container";

export const metadata = {
  title: "AGB",
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
        Orientierung. Ein verbindliches Angebot oder ein Auftrag entsteht erst nach Prüfung und
        ausdrücklicher Bestätigung durch Schnell Sicher Umzug.
      </p>

      <h2>2. Leistungsumfang</h2>
      <p>
        Maßgeblich ist der individuell bestätigte Leistungsumfang. Änderungen, Zusatzleistungen oder
        Abweichungen vom ursprünglich mitgeteilten Umfang können zu einer Anpassung von Preis,
        Zeitplanung und Einsatzumfang führen.
      </p>

      <h2>3. Mitwirkungspflichten des Kunden</h2>
      <p>
        Der Kunde stellt sicher, dass alle für die Durchführung notwendigen Angaben vollständig und
        richtig übermittelt werden. Dazu gehören insbesondere Adressen, Zugänge, Etagen, Aufzüge,
        Haltemöglichkeiten, Volumen- und Leistungsangaben sowie besondere Risiken oder Hindernisse.
      </p>

      <h2>4. Termine und Erreichbarkeit</h2>
      <p>
        Schnell Sicher Umzug ist telefonisch 24/7 erreichbar. Konkrete Einsätze und Uhrzeiten
        erfolgen nach Vereinbarung und Verfügbarkeit.
      </p>

      <h2>5. Preise und Zahlung</h2>
      <p>
        Alle Richtpreise, Preisbeispiele und Online-Kalkulationen sind unverbindlich. Maßgeblich ist
        der bestätigte Preis im freigegebenen Angebot, Auftrag oder in der Rechnung. Zusätzlicher
        Aufwand kann nach vorheriger Abstimmung gesondert berechnet werden.
      </p>

      <h2>6. Haftung</h2>
      <p>
        Es gelten die gesetzlichen Haftungsvorschriften. Für unvollständige oder unzutreffende
        Kundenangaben, nicht gemeldete Besonderheiten oder ausgeschlossene Stoffe und Materialien
        wird keine Haftung übernommen, soweit gesetzlich zulässig.
      </p>

      <h2>7. Elektronische Bestätigung</h2>
      <p>
        Soweit Dokumente elektronisch bestätigt werden, erfolgt dies nur nach ausdrücklicher
        Freigabe durch Schnell Sicher Umzug. Es handelt sich um eine einfache elektronische
        Unterschrift beziehungsweise elektronische Bestätigung im Rahmen des angebotenen Workflows.
      </p>

      <h2>8. Schlussbestimmungen</h2>
      <p>
        Es gilt deutsches Recht. Sollten einzelne Bestimmungen unwirksam sein oder werden, bleibt
        die Wirksamkeit der übrigen Bestimmungen unberührt.
      </p>
    </Container>
  );
}

import { Container } from "@/components/container";

export const metadata = {
  title: "Datenschutz",
};

export default function DatenschutzPage() {
  return (
    <Container className="prose prose-slate dark:prose-invert max-w-3xl py-14">
      <h1>Datenschutzerklrung</h1>

      <p>
        Diese Datenschutzerklrung informiert Sie ber die Verarbeitung personenbezogener Daten auf
        dieser Website.
      </p>

      <h2>1. Verantwortlicher</h2>
      <p>
        Schnell Sicher Umzug
        <br />
        Inhaber: Baschar Al Hasan
        <br />
        Anzengruber Strae 9
        <br />
        12043 Berlin
        <br />
        Telefon: +49 176 24863305
        <br />
        EMail: kontakt@schnellsicherumzug.de
      </p>

      <h2>2. Erhebung und Speicherung personenbezogener Daten</h2>
      <p>
        Wir erheben und speichern personenbezogene Daten (z. B. Name, Telefonnummer, EMail-Adresse,
        Anschrift) nur, wenn Sie uns diese freiwillig ber Formulare auf unserer Website oder per
        EMail mitteilen.
      </p>
      <p>Die erhobenen Daten werden ausschlielich zur Bearbeitung Ihrer Anfrage verwendet.</p>

      <h2>3. Rechtsgrundlage der Verarbeitung</h2>
      <p>
        Die Verarbeitung Ihrer personenbezogenen Daten erfolgt gem Art. 6 Abs. 1 lit. b DSGVO
        (Vertragserfllung oder vorvertragliche Manahmen) sowie Art. 6 Abs. 1 lit. a DSGVO
        (Einwilligung).
      </p>

      <h2>4. Weitergabe der Daten</h2>
      <p>
        Eine Weitergabe Ihrer Daten an Dritte erfolgt nicht, es sei denn, wir sind gesetzlich dazu
        verpflichtet oder Sie haben ausdrcklich eingewilligt.
      </p>

      <h2>5. Speicherdauer</h2>
      <p>
        Ihre Daten werden gelscht, sobald der Zweck der Speicherung entfllt, sptestens jedoch 6
        Monate nach Abschluss der Anfrage, sofern keine gesetzlichen Aufbewahrungspflichten
        bestehen.
      </p>

      <h2>6. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Lschung, Einschrnkung der Verarbeitung
        sowie auf Datenbertragbarkeit.
      </p>
      <p>
        Zudem haben Sie das Recht, der Verarbeitung Ihrer personenbezogenen Daten jederzeit zu
        widersprechen.
      </p>
      <p>
        Bitte senden Sie Ihre Anfrage an: <a href="mailto:kontakt@schnellsicherumzug.de">kontakt@schnellsicherumzug.de</a>
      </p>

      <h2>7. Sicherheit Ihrer Daten</h2>
      <p>
        Wir treffen geeignete technische und organisatorische Manahmen, um Ihre personenbezogenen
        Daten vor Verlust, Missbrauch oder unbefugtem Zugriff zu schtzen.
      </p>

      <h2>8. Cookies und Analyse-Tools</h2>
      <p>
        Unsere Website verwendet ggf. Cookies, um die Benutzerfreundlichkeit zu verbessern. Sie
        knnen die Speicherung von Cookies in den Browsereinstellungen jederzeit deaktivieren.
      </p>

      <h2>9. nderungen dieser Datenschutzerklrung</h2>
      <p>
        Wir behalten uns das Recht vor, diese Datenschutzerklrung jederzeit anzupassen. Der
        aktuelle Stand ist Februar 2026.
      </p>
    </Container>
  );
}



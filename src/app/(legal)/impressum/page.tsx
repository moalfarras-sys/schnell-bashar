import { Container } from "@/components/container";

export const metadata = {
  title: "Impressum | Schnell Sicher Umzug",
  description: "Impressum und Anbieterkennzeichnung von Schnell Sicher Umzug.",
};

export default function ImpressumPage() {
  return (
    <Container className="prose prose-slate max-w-3xl py-14 dark:prose-invert">
      <h1>Impressum</h1>

      <h2>Anbieterkennzeichnung</h2>
      <p>
        Schnell Sicher Umzug
        <br />
        Inhaber: Baschar Al Hasan
        <br />
        Anzengruber Straße 9
        <br />
        12043 Berlin
      </p>

      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        Telefon: +49 172 9573681
        <br />
        E-Mail: <a href="mailto:kontakt@schnellsicherumzug.de">kontakt@schnellsicherumzug.de</a>
        <br />
        Website: <a href="https://schnellsicherumzug.de">https://schnellsicherumzug.de</a>
      </p>

      <h2>Verantwortlich für den Inhalt</h2>
      <p>Baschar Al Hasan, Anschrift wie oben.</p>

      <h2>Hinweis zur Kontaktaufnahme</h2>
      <p>
        Telefonisch 24/7 erreichbar. Termine und Einsätze nach Vereinbarung.
      </p>

      <h2>Haftung für Inhalte und Links</h2>
      <p>
        Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte
        externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber
        verantwortlich.
      </p>
    </Container>
  );
}

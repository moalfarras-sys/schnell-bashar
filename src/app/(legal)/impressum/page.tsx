import { Container } from "@/components/container";

export const metadata = {
  title: "Impressum",
};

export default function ImpressumPage() {
  return (
    <Container className="prose prose-slate dark:prose-invert max-w-3xl py-14">
      <h1>Impressum</h1>

      <h2>Angaben gemäß § 5 TMG</h2>
      <p>
        Schnell Sicher Umzug
        <br />
        Inhaber: Baschar Al Hasan
        <br />
        Anzengruber Straße 9
        <br />
        12043 Berlin
      </p>

      <h2>Kontakt</h2>
      <p>
        Telefon: +49 172 9573681 / +49 176 24863305
        <br />
        E‑Mail: <a href="mailto:kontakt@schnellsicherumzug.de">kontakt@schnellsicherumzug.de</a>
      </p>

      <h2>Verantwortlich für den Inhalt</h2>
      <p>Baschar Al Hasan</p>

      <h2>Haftungshinweis</h2>
      <p>
        Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte
        externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber
        verantwortlich.
      </p>

      <p className="text-sm text-slate-500">
        Hinweis: Dieses Impressum ist eine Vorlage. Bitte prüfen und ergänzen Sie ggf. weitere
        Pflichtangaben (z. B. USt‑ID, Registereintrag), sofern zutreffend.
      </p>
    </Container>
  );
}


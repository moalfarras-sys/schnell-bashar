import { Container } from "@/components/container";

export const metadata = {
  title: "Impressum",
};

export default function ImpressumPage() {
  return (
    <Container className="prose prose-slate dark:prose-invert max-w-3xl py-14">
      <h1>Impressum</h1>

      <h2>Angaben gem § 5 TMG</h2>
      <p>
        Schnell Sicher Umzug
        <br />
        Inhaber: Baschar Al Hasan
        <br />
        Anzengruber Strae 9
        <br />
        12043 Berlin
      </p>

      <h2>Kontakt</h2>
      <p>
        Telefon: +49 172 9573681 / +49 176 24863305
        <br />
        EMail: <a href="mailto:kontakt@schnellsicherumzug.de">kontakt@schnellsicherumzug.de</a>
      </p>

      <h2>Verantwortlich fr den Inhalt</h2>
      <p>Baschar Al Hasan</p>

      <h2>Haftungshinweis</h2>
      <p>
        Trotz sorgfltiger inhaltlicher Kontrolle bernehmen wir keine Haftung fr die Inhalte
        externer Links. Fr den Inhalt der verlinkten Seiten sind ausschlielich deren Betreiber
        verantwortlich.
      </p>

      <p className="text-sm text-slate-500">
        Hinweis: Dieses Impressum ist eine Vorlage. Bitte prfen und ergnzen Sie ggf. weitere
        Pflichtangaben (z. B. UStID, Registereintrag), sofern zutreffend.
      </p>
    </Container>
  );
}



import { BaseDocumentLayout } from "@/lib/documents/templates/base-layout";

export function AgbAppendixTemplate({ number }: { number: string }) {
  return (
    <BaseDocumentLayout title="Kurz-AGB / Zusatzseite" documentNumber={number}>
      <section className="card">
        <h2 className="section-title">Kurz-AGB</h2>
        <p>
          Diese Zusatzseite enthält die für das jeweilige Dokument eingebundenen Rechtstexte.
          Die finale juristische Prüfung bleibt erforderlich.
        </p>
      </section>
    </BaseDocumentLayout>
  );
}

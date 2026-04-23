import { BaseDocumentLayout } from "@/lib/documents/templates/base-layout";
import { formatGermanCurrency, formatGermanDate } from "@/lib/documents/formatting";
import type { DocumentVersionSnapshot } from "@/lib/documents/types";

export function MahnungTemplate({ number, snapshot }: { number: string; snapshot: DocumentVersionSnapshot }) {
  return (
    <BaseDocumentLayout title="Zahlungserinnerung / Mahnung" documentNumber={number}>
      <section className="card">
        <h2 className="section-title">Kunde</h2>
        <div>{snapshot.customerData.name}</div>
        <div>{snapshot.customerData.billingAddress || "-"}</div>
        <div>Neue Frist: {formatGermanDate(snapshot.dueAt || null) || "-"}</div>
      </section>
      <section className="card">
        <p>
          Bitte begleichen Sie den offenen Betrag in Höhe von{" "}
          <strong>{formatGermanCurrency(snapshot.grossCents)}</strong> bis spätestens{" "}
          <strong>{formatGermanDate(snapshot.dueAt || null) || "-"}</strong>.
        </p>
      </section>
    </BaseDocumentLayout>
  );
}

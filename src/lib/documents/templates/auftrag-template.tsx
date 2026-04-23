import { BaseDocumentLayout } from "@/lib/documents/templates/base-layout";
import { formatGermanCurrency, formatGermanDate } from "@/lib/documents/formatting";
import type { DocumentVersionSnapshot } from "@/lib/documents/types";

export function AuftragTemplate({ number, snapshot }: { number: string; snapshot: DocumentVersionSnapshot }) {
  return (
    <BaseDocumentLayout title="Auftrag / Vertrag" documentNumber={number}>
      <div className="two-col">
        <section className="card">
          <h2 className="section-title">Auftraggeber</h2>
          <div>{snapshot.customerData.name}</div>
          <div>{snapshot.customerData.billingAddress || "-"}</div>
          <div>{snapshot.customerData.email || "-"}</div>
          <div>{snapshot.customerData.phone || "-"}</div>
        </section>
        <section className="card">
          <h2 className="section-title">Leistungsrahmen</h2>
          <div>Leistung: {snapshot.serviceData?.serviceType || "-"}</div>
          <div>Termin: {formatGermanDate(snapshot.serviceData?.serviceDate || null) || "-"}</div>
          <div>Von: {snapshot.addressData?.fromAddress || "-"}</div>
          <div>Nach: {snapshot.addressData?.toAddress || "-"}</div>
        </section>
      </div>

      <section className="card">
        <h2 className="section-title">Vergütung</h2>
        <div className="totals">
          <div className="totals-row"><span>Netto</span><span>{formatGermanCurrency(snapshot.subtotalCents)}</span></div>
          <div className="totals-row"><span>MwSt.</span><span>{formatGermanCurrency(snapshot.taxCents)}</span></div>
          <div className="totals-row total"><span>Gesamt</span><span>{formatGermanCurrency(snapshot.grossCents)}</span></div>
        </div>
      </section>

      <section className="card signature">
        <h2 className="section-title">Elektronische Bestätigung</h2>
        <p className="muted">
          Die elektronische Bestätigung ist erst nach ausdrücklicher Freigabe durch Schnell Sicher Umzug möglich.
        </p>
        <div className="two-col">
          <div className="signature-line">Schnell Sicher Umzug</div>
          <div className="signature-line">Auftraggeber</div>
        </div>
      </section>
    </BaseDocumentLayout>
  );
}

import { BaseDocumentLayout } from "@/lib/documents/templates/base-layout";
import { formatGermanCurrency, formatGermanDate } from "@/lib/documents/formatting";
import type { DocumentVersionSnapshot } from "@/lib/documents/types";

export function RechnungTemplate({ number, snapshot }: { number: string; snapshot: DocumentVersionSnapshot }) {
  return (
    <BaseDocumentLayout title="Rechnung" documentNumber={number}>
      <section className="card">
        <h2 className="section-title">Abrechnung</h2>
        <div>Kunde: {snapshot.customerData.name}</div>
        <div>Adresse: {snapshot.customerData.billingAddress || "-"}</div>
        <div>Leistung: {snapshot.serviceData?.serviceType || "-"}</div>
        <div>Fällig am: {formatGermanDate(snapshot.dueAt || null) || "-"}</div>
      </section>
      <section className="card">
        <table>
          <thead>
            <tr>
              <th>Position</th>
              <th>Menge</th>
              <th>Brutto</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.lineItems.map((item) => (
              <tr key={`${item.position}-${item.title}`}>
                <td>{item.title}</td>
                <td>{item.quantity} {item.unit}</td>
                <td>{formatGermanCurrency(item.totalGrossCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="totals">
          <div className="totals-row"><span>Netto</span><span>{formatGermanCurrency(snapshot.subtotalCents)}</span></div>
          <div className="totals-row"><span>MwSt.</span><span>{formatGermanCurrency(snapshot.taxCents)}</span></div>
          <div className="totals-row total"><span>Gesamtbetrag</span><span>{formatGermanCurrency(snapshot.grossCents)}</span></div>
        </div>
      </section>
    </BaseDocumentLayout>
  );
}

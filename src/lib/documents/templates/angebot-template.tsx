import { BaseDocumentLayout } from "@/lib/documents/templates/base-layout";
import { formatGermanCurrency, formatGermanDate } from "@/lib/documents/formatting";
import type { DocumentVersionSnapshot } from "@/lib/documents/types";

export function AngebotTemplate({ number, snapshot }: { number: string; snapshot: DocumentVersionSnapshot }) {
  return (
    <BaseDocumentLayout title="Angebot" documentNumber={number}>
      <div className="two-col">
        <section className="card">
          <h2 className="section-title">Kundendaten</h2>
          <div>{snapshot.customerData.name}</div>
          <div>{snapshot.customerData.billingAddress || "-"}</div>
          <div>{snapshot.customerData.email || "-"}</div>
          <div>{snapshot.customerData.phone || "-"}</div>
        </section>
        <section className="card">
          <h2 className="section-title">Leistungsdaten</h2>
          <div>Leistung: {snapshot.serviceData?.serviceType || "-"}</div>
          <div>Datum: {formatGermanDate(snapshot.serviceData?.serviceDate || null) || "-"}</div>
          <div>Von: {snapshot.addressData?.fromAddress || "-"}</div>
          <div>Nach: {snapshot.addressData?.toAddress || "-"}</div>
        </section>
      </div>

      <section className="card">
        <h2 className="section-title">Positionen</h2>
        <table>
          <thead>
            <tr>
              <th>Leistung</th>
              <th>Menge</th>
              <th>Netto</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.lineItems.map((item) => (
              <tr key={`${item.position}-${item.title}`}>
                <td>
                  <div>{item.title}</div>
                  {item.description ? <div className="muted">{item.description}</div> : null}
                </td>
                <td>{item.quantity} {item.unit}</td>
                <td>{formatGermanCurrency(item.totalNetCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals">
          <div className="totals-row"><span>Zwischensumme</span><span>{formatGermanCurrency(snapshot.subtotalCents)}</span></div>
          <div className="totals-row"><span>MwSt.</span><span>{formatGermanCurrency(snapshot.taxCents)}</span></div>
          <div className="totals-row total"><span>Gesamt</span><span>{formatGermanCurrency(snapshot.grossCents)}</span></div>
        </div>
      </section>
    </BaseDocumentLayout>
  );
}

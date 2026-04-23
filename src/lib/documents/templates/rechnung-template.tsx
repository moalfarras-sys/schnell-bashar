import { BaseDocumentLayout } from "@/lib/documents/templates/base-layout";
import {
  buildLineItemDescription,
  cleanDisplayText,
  formatAddress,
  formatGermanCurrency,
  formatGermanDate,
  normalizeContactFields,
} from "@/lib/documents/formatting";
import type { DocumentVersionSnapshot } from "@/lib/documents/types";

export function RechnungTemplate({ number, snapshot }: { number: string; snapshot: DocumentVersionSnapshot }) {
  const contacts = normalizeContactFields({
    email: snapshot.customerData.email,
    phone: snapshot.customerData.phone,
  });
  const customerName = cleanDisplayText(snapshot.customerData.name, { kind: "name" });
  const billingAddress = formatAddress(snapshot.customerData.billingAddress);
  const serviceType = cleanDisplayText(snapshot.serviceData?.serviceType);
  const dueAt = formatGermanDate(snapshot.dueAt || null);

  return (
    <BaseDocumentLayout
      title="Rechnung"
      documentNumber={number}
      metaRows={[
        {
          label: "Rechnungsnr.",
          value: cleanDisplayText(number, { allowInternalIdentifier: false }) || "Noch nicht vergeben",
        },
        { label: "Fällig am", value: dueAt || null },
      ]}
    >
      <section className="card">
        <h2 className="section-title">Abrechnung</h2>
        {customerName ? <div>Kunde: {customerName}</div> : null}
        {billingAddress ? <div>Adresse: {billingAddress}</div> : null}
        {contacts.email ? <div>E-Mail: {contacts.email}</div> : null}
        {contacts.phone ? <div>Telefon: {contacts.phone}</div> : null}
        {serviceType ? <div>Leistung: {serviceType}</div> : null}
        {dueAt ? <div>Fällig am: {dueAt}</div> : null}
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
                <td>
                  <div>{cleanDisplayText(item.title) || "Position"}</div>
                  {buildLineItemDescription(null, item.description) ? (
                    <div className="muted">{buildLineItemDescription(null, item.description)}</div>
                  ) : null}
                </td>
                <td>
                  {item.quantity} {item.unit}
                </td>
                <td>{formatGermanCurrency(item.totalGrossCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="totals">
          <div className="totals-row">
            <span>Netto</span>
            <span>{formatGermanCurrency(snapshot.subtotalCents)}</span>
          </div>
          <div className="totals-row">
            <span>MwSt.</span>
            <span>{formatGermanCurrency(snapshot.taxCents)}</span>
          </div>
          <div className="totals-row total">
            <span>Gesamtbetrag</span>
            <span>{formatGermanCurrency(snapshot.grossCents)}</span>
          </div>
        </div>
      </section>
    </BaseDocumentLayout>
  );
}

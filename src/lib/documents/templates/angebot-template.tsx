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

export function AngebotTemplate({ number, snapshot }: { number: string; snapshot: DocumentVersionSnapshot }) {
  const contacts = normalizeContactFields({
    email: snapshot.customerData.email,
    phone: snapshot.customerData.phone,
  });
  const serviceType = cleanDisplayText(snapshot.serviceData?.serviceType);
  const serviceDate = formatGermanDate(snapshot.serviceData?.serviceDate || null);
  const fromAddress = formatAddress(snapshot.addressData?.fromAddress);
  const toAddress = formatAddress(snapshot.addressData?.toAddress);
  const notes = cleanDisplayText(snapshot.visibleNotes);

  return (
    <BaseDocumentLayout
      title="Angebot"
      documentNumber={number}
      metaRows={[
        { label: "Angebotsnr.", value: cleanDisplayText(number, { allowInternalIdentifier: false }) || "Noch nicht vergeben" },
        { label: "Datum", value: serviceDate || null },
        { label: "Gültig bis", value: formatGermanDate(snapshot.dueAt || null) || null },
      ]}
    >
      <div className="two-col">
        <section className="card">
          <h2 className="section-title">Kundendaten</h2>
          {cleanDisplayText(snapshot.customerData.name, { kind: "name" }) ? <div>{cleanDisplayText(snapshot.customerData.name, { kind: "name" })}</div> : null}
          {formatAddress(snapshot.customerData.billingAddress) ? <div>{formatAddress(snapshot.customerData.billingAddress)}</div> : null}
          {contacts.email ? <div>E-Mail: {contacts.email}</div> : null}
          {contacts.phone ? <div>Telefon: {contacts.phone}</div> : null}
        </section>
        <section className="card">
          <h2 className="section-title">Leistungsdaten</h2>
          {serviceType ? <div>Leistung: {serviceType}</div> : null}
          {serviceDate ? <div>Datum: {serviceDate}</div> : null}
          {fromAddress ? <div>Von: {fromAddress}</div> : null}
          {toAddress ? <div>Nach: {toAddress}</div> : null}
        </section>
      </div>

      {notes ? (
        <section className="card">
          <h2 className="section-title">Hinweise</h2>
          <div>{notes}</div>
        </section>
      ) : null}

      <section className="card">
        <h2 className="section-title">Leistungsumfang</h2>
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
                  <div>{cleanDisplayText(item.title) || "Leistung"}</div>
                  {buildLineItemDescription(null, item.description) ? (
                    <div className="muted">{buildLineItemDescription(null, item.description)}</div>
                  ) : null}
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

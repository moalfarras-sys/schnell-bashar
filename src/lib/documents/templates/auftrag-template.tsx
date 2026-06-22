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

export function AuftragTemplate({ number, snapshot }: { number: string; snapshot: DocumentVersionSnapshot }) {
  const contacts = normalizeContactFields({
    email: snapshot.customerData.email,
    phone: snapshot.customerData.phone,
  });
  const serviceType = cleanDisplayText(snapshot.serviceData?.serviceType);
  const serviceDate = formatGermanDate(snapshot.serviceData?.serviceDate || null);
  const fromAddress = formatAddress(snapshot.addressData?.fromAddress);
  const toAddress = formatAddress(snapshot.addressData?.toAddress);

  return (
    <BaseDocumentLayout
      title="Auftrag / Vertrag"
      documentNumber={number}
      metaRows={[
        { label: "Auftragsnr.", value: cleanDisplayText(number, { allowInternalIdentifier: false }) || "Noch nicht vergeben" },
        { label: "Datum", value: serviceDate || null },
      ]}
    >
      <div className="two-col">
        <section className="card">
          <h2 className="section-title">Auftraggeber</h2>
          {cleanDisplayText(snapshot.customerData.name, { kind: "name" }) ? <div>{cleanDisplayText(snapshot.customerData.name, { kind: "name" })}</div> : null}
          {formatAddress(snapshot.customerData.billingAddress) ? <div>{formatAddress(snapshot.customerData.billingAddress)}</div> : null}
          {contacts.email ? <div>E-Mail: {contacts.email}</div> : null}
          {contacts.phone ? <div>Telefon: {contacts.phone}</div> : null}
        </section>
        <section className="card">
          <h2 className="section-title">Leistungsrahmen</h2>
          {serviceType ? <div>Leistung: {serviceType}</div> : null}
          {serviceDate ? <div>Termin: {serviceDate}</div> : null}
          {fromAddress ? <div>Von: {fromAddress}</div> : null}
          {toAddress ? <div>Nach: {toAddress}</div> : null}
        </section>
      </div>

      <section className="card">
        <h2 className="section-title">Vergütung</h2>
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
        <div className="signature-grid">
          <div>
            <div className="stamp-box" style={{ border: "none", padding: 0 }}>
              <img src="https://schnellsicherumzug.de/media/brand/company-stamp-clean.png" alt="Company Stamp" style={{ maxHeight: "70px", maxWidth: "170px" }} />
            </div>
            <div className="signature-line">Ort, Datum / Unternehmen</div>
          </div>
          <div>
            <div className="signature-line customer-line">Auftraggeber</div>
          </div>
        </div>
      </section>
    </BaseDocumentLayout>
  );
}

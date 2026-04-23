import { BaseDocumentLayout } from "@/lib/documents/templates/base-layout";
import {
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

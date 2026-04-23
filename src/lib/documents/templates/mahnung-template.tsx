import { BaseDocumentLayout } from "@/lib/documents/templates/base-layout";
import {
  cleanDisplayText,
  formatAddress,
  formatGermanCurrency,
  formatGermanDate,
  normalizeContactFields,
} from "@/lib/documents/formatting";
import type { DocumentVersionSnapshot } from "@/lib/documents/types";

export function MahnungTemplate({ number, snapshot }: { number: string; snapshot: DocumentVersionSnapshot }) {
  const contacts = normalizeContactFields({
    email: snapshot.customerData.email,
    phone: snapshot.customerData.phone,
  });
  const dueAt = formatGermanDate(snapshot.dueAt || null);

  return (
    <BaseDocumentLayout
      title="Zahlungserinnerung / Mahnung"
      documentNumber={number}
      metaRows={[
        {
          label: "Mahnungsnr.",
          value: cleanDisplayText(number, { allowInternalIdentifier: false }) || "Noch nicht vergeben",
        },
        { label: "Neue Frist", value: dueAt || null },
      ]}
    >
      <section className="card">
        <h2 className="section-title">Kunde</h2>
        {cleanDisplayText(snapshot.customerData.name, { kind: "name" }) ? (
          <div>{cleanDisplayText(snapshot.customerData.name, { kind: "name" })}</div>
        ) : null}
        {formatAddress(snapshot.customerData.billingAddress) ? (
          <div>{formatAddress(snapshot.customerData.billingAddress)}</div>
        ) : null}
        {contacts.email ? <div>E-Mail: {contacts.email}</div> : null}
        {contacts.phone ? <div>Telefon: {contacts.phone}</div> : null}
      </section>
      <section className="card">
        <p>
          Bitte begleichen Sie den offenen Betrag in Höhe von{" "}
          <strong>{formatGermanCurrency(snapshot.grossCents)}</strong>
          {dueAt ? (
            <>
              {" "}bis spätestens <strong>{dueAt}</strong>.
            </>
          ) : (
            <> fristgerecht.</>
          )}
        </p>
      </section>
    </BaseDocumentLayout>
  );
}

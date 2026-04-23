"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type Props = {
  mode: "create" | "edit";
  documentId?: string;
  initial?: {
    type?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    billingAddress?: string;
    serviceType?: string;
    visibleNotes?: string;
    internalNotes?: string;
    grossCents?: number;
  };
};

const inputClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-400 dark:focus:ring-brand-500/25";

export function DocumentEditor({ mode, documentId, initial }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState(initial?.type || "ANGEBOT");
  const [customerName, setCustomerName] = useState(initial?.customerName || "");
  const [customerEmail, setCustomerEmail] = useState(initial?.customerEmail || "");
  const [customerPhone, setCustomerPhone] = useState(initial?.customerPhone || "");
  const [billingAddress, setBillingAddress] = useState(initial?.billingAddress || "");
  const [serviceType, setServiceType] = useState(initial?.serviceType || "");
  const [visibleNotes, setVisibleNotes] = useState(initial?.visibleNotes || "");
  const [internalNotes, setInternalNotes] = useState(initial?.internalNotes || "");
  const [grossCents, setGrossCents] = useState(String(initial?.grossCents ?? 0));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const gross = Number(grossCents);
    const net = Math.round(gross / 1.19);
    const vat = gross - net;
    const body = {
      type,
      customerData: {
        name: customerName,
        email: customerEmail || null,
        phone: customerPhone || null,
        billingAddress: billingAddress || null,
      },
      serviceData: {
        serviceType: serviceType || null,
      },
      visibleNotes: visibleNotes || null,
      internalNotes: internalNotes || null,
      lineItems: [
        {
          position: 1,
          title: serviceType || "Leistung",
          description: visibleNotes || null,
          quantity: 1,
          unit: "Pauschale",
          unitPriceNetCents: net,
          vatRate: 19,
          totalNetCents: net,
          totalGrossCents: gross,
        },
      ],
    };

    const response = await fetch(
      mode === "create" ? "/api/admin/documents" : `/api/admin/documents/${documentId}`,
      {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Speichern fehlgeschlagen.");
      setLoading(false);
      return;
    }

    router.push(mode === "create" ? `/admin/dokumente/${data.id}` : `/admin/dokumente/${documentId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">Dokumenttyp</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputClassName}>
            <option value="ANGEBOT">Angebot</option>
            <option value="RECHNUNG">Rechnung</option>
            <option value="AUFTRAG_VERTRAG">Auftrag / Vertrag</option>
            <option value="MAHNUNG">Mahnung</option>
            <option value="AGB_APPENDIX">AGB-Zusatzseite</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">Gesamtbetrag brutto in Cent</label>
          <input value={grossCents} onChange={(e) => setGrossCents(e.target.value)} className={inputClassName} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">Kundenname</label>
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClassName} required />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">E-Mail</label>
          <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className={inputClassName} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">Telefon</label>
          <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={inputClassName} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">Leistung</label>
          <input
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className={inputClassName}
            placeholder="Umzug Berlin"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">Rechnungsadresse</label>
        <textarea value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} className={`${inputClassName} min-h-24 resize-y`} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">Sichtbare Notizen</label>
        <textarea value={visibleNotes} onChange={(e) => setVisibleNotes(e.target.value)} className={`${inputClassName} min-h-24 resize-y`} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200">Interne Notizen</label>
        <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} className={`${inputClassName} min-h-24 resize-y`} />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <Button type="submit" disabled={loading}>
        {loading ? "Wird gespeichert..." : mode === "create" ? "Entwurf speichern" : "Änderungen speichern"}
      </Button>
    </form>
  );
}

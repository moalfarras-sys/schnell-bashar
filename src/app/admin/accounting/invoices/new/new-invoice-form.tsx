"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  CheckCircle2,
  ClipboardList,
  Loader2,
  PackagePlus,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AddressAutocompleteInput } from "@/components/address/address-autocomplete-input";
import { Button } from "@/components/ui/button";
import type {
  ManualInvoiceReferences,
  ManualInvoiceServiceDetails,
} from "@/lib/manual-invoice";

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function euroToCents(value: string): number {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return 0;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

/** Display for controlled unit price when not actively editing (German decimal comma). */
function centsToUnitPriceField(cents: number): string {
  if (cents === 0) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

type InvoicePaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

type LineItem = {
  id: string;
  description: string;
  detail: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  vatPercent: number;
  workHours: string;
  areaSqm: string;
  volumeM3: string;
  floor: string;
  pieces: string;
};

const SMART_LINE_PRESETS = [
  {
    label: "Umzug",
    description: "Umzugsservice",
    detail: "Transport, Tragehilfe und sichere Verladung nach individueller Planung.",
    unit: "Pauschale",
  },
  {
    label: "Montage",
    description: "Möbelmontage",
    detail: "Demontage und Montage von Möbeln inkl. Werkzeug und Arbeitszeit.",
    unit: "Stunde",
  },
  {
    label: "Entsorgung",
    description: "Entsorgung",
    detail: "Abholung, Sortierung und fachgerechte Entsorgung nach Aufwand.",
    unit: "Pauschale",
  },
  {
    label: "Verpackung",
    description: "Verpackungsmaterial",
    detail: "Kartons, Folien, Decken und Schutzmaterial nach Bedarf.",
    unit: "Pauschale",
  },
  {
    label: "Halteverbotszone",
    description: "Halteverbotszone",
    detail: "Einrichtung und Organisation der Halteverbotszone.",
    unit: "Pauschale",
  },
  {
    label: "Zusatzservice",
    description: "Zusatzleistung",
    detail: "Individuell definierte Zusatzleistung gemäß Kundenwunsch.",
    unit: "Stück",
  },
];

const SERVICE_TYPE_PRESETS = [
  "Privatumzug",
  "Firmenumzug",
  "Montage",
  "Entsorgung",
  "Kombi-Service",
  "Spezialtransport",
];

const ELEVATOR_OPTIONS = ["Mit Aufzug", "Ohne Aufzug", "Teilweise mit Aufzug"];

const DEFAULT_PAYMENT_TERMS =
  "Die Zahlung spätestens 3 Tage vor dem Umzugstag überweisen oder am Umzugstag in Echtzeitüberweisung oder in Bar 50% vor dem Beladen und 50 % vor dem Entladen.";

function newLineItem(preset?: Partial<LineItem>): LineItem {
  return {
    id: crypto.randomUUID(),
    description: preset?.description || "",
    detail: preset?.detail || "",
    quantity: preset?.quantity ?? 1,
    unit: preset?.unit || "Stück",
    unitPriceCents: preset?.unitPriceCents ?? 0,
    vatPercent: preset?.vatPercent ?? 19,
    workHours: preset?.workHours || "",
    areaSqm: preset?.areaSqm || "",
    volumeM3: preset?.volumeM3 || "",
    floor: preset?.floor || "",
    pieces: preset?.pieces || "",
  };
}

const inputCls =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100";
const labelCls = "mb-1.5 block text-sm font-semibold text-slate-700";
const sectionCls =
  "rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]";

function MoveRowButtons({
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  return (
    <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        disabled={!canMoveUp}
        onClick={onMoveUp}
        className="rounded-full px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ↑
      </button>
      <button
        type="button"
        disabled={!canMoveDown}
        onClick={onMoveDown}
        className="rounded-full px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ↓
      </button>
    </div>
  );
}

export function NewInvoiceForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [issuedAt, setIssuedAt] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDays, setDueDays] = useState(14);
  const [invoiceSuffix, setInvoiceSuffix] = useState("");
  const [description, setDescription] = useState("Rechnung gemäß individuell definiertem Leistungsumfang.");
  const [notes, setNotes] = useState(DEFAULT_PAYMENT_TERMS);
  const [paymentStatus, setPaymentStatus] = useState<InvoicePaymentStatus>("UNPAID");
  const [initialPaymentEuro, setInitialPaymentEuro] = useState("");
  const [initialPaymentMethod, setInitialPaymentMethod] = useState("BANK_TRANSFER");
  const [paymentReference, setPaymentReference] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);

  const [manualReferences, setManualReferences] = useState<ManualInvoiceReferences>({
    orderRef: "",
    offerRef: "",
    contractRef: "",
    projectRef: "",
    externalLink: "",
  });
  const [serviceDetails, setServiceDetails] = useState<ManualInvoiceServiceDetails>({
    serviceType: "",
    serviceDate: "",
    workHours: "",
    areaSqm: "",
    volumeM3: "",
    floor: "",
    elevator: "",
    startAddress: "",
    destinationAddress: "",
    additionalInfo: "",
  });

  const [items, setItems] = useState<LineItem[]>([newLineItem()]);
  /** Avoid reformatting unit price on every keystroke (fixes caret / mobile typing bugs). */
  const [unitPriceDraftById, setUnitPriceDraftById] = useState<Record<string, string>>({});

  const totals = useMemo(() => {
    let subNetCents = 0;
    const computed = items.map((item) => {
      const lineTotalCents = Math.round(item.quantity * item.unitPriceCents);
      const lineVatCents = Math.round(lineTotalCents * (item.vatPercent / 100));
      subNetCents += lineTotalCents;
      return { ...item, lineTotalCents, lineVatCents };
    });

    const discountCents =
      discountPercent > 0 ? Math.round(subNetCents * (discountPercent / 100)) : 0;
    const netCents = subNetCents - discountCents;
    const vatCents = Math.round(
      computed.reduce((sum, item) => {
        const share = item.lineTotalCents / (subNetCents || 1);
        return sum + Math.round((netCents * share * item.vatPercent) / 100);
      }, 0),
    );
    const grossCents = netCents + vatCents;
    const suggestedDepositCents = Math.round(grossCents * 0.5);
    const parsedInitialPaymentCents =
      paymentStatus === "PAID"
        ? grossCents
        : paymentStatus === "PARTIAL"
          ? Math.min(grossCents, Math.max(0, euroToCents(initialPaymentEuro)))
          : 0;
    const remainingCents = Math.max(0, grossCents - parsedInitialPaymentCents);

    return {
      computed,
      subNetCents,
      discountCents,
      netCents,
      vatCents,
      grossCents,
      suggestedDepositCents,
      parsedInitialPaymentCents,
      remainingCents,
    };
  }, [discountPercent, initialPaymentEuro, items, paymentStatus]);

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function moveItem(id: string, direction: -1 | 1) {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function addItem(preset?: Partial<LineItem>) {
    setItems((current) => [...current, newLineItem(preset)]);
  }

  function removeItem(id: string) {
    setUnitPriceDraftById((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });
    setItems((current) => {
      const next = current.filter((item) => item.id !== id);
      return next.length > 0 ? next : [newLineItem()];
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!customerName || !customerEmail) {
      setError("Name und E-Mail sind Pflichtfelder.");
      setLoading(false);
      return;
    }

    if (invoiceSuffix && !/^\d{3}$/.test(invoiceSuffix.trim())) {
      setError("Bitte für die Rechnungsnummer genau 3 Ziffern eintragen.");
      setLoading(false);
      return;
    }

    const validItems = items.filter(
      (item) => item.description.trim() && item.quantity > 0 && item.unitPriceCents > 0,
    );
    if (validItems.length === 0) {
      setError("Bitte mindestens eine gültige Position mit Beschreibung, Menge und Preis erfassen.");
      setLoading(false);
      return;
    }

    if (paymentStatus === "PARTIAL" && totals.parsedInitialPaymentCents <= 0) {
      setError("Für eine Teilzahlung bitte einen Anzahlungsbetrag eintragen.");
      setLoading(false);
      return;
    }

    try {
      const body = {
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        address: address || undefined,
        description: description || undefined,
        notes: notes || undefined,
        issuedAt,
        dueDays,
        invoiceSuffix: invoiceSuffix || undefined,
        paymentStatus,
        initialPaymentCents: totals.parsedInitialPaymentCents,
        initialPaymentMethod,
        paymentReference: paymentReference || undefined,
        discountPercent: discountPercent > 0 ? discountPercent : undefined,
        manualReferences,
        serviceDetails,
        items: validItems.map((item, index) => ({
          description: item.description,
          detail: item.detail || undefined,
          quantity: item.quantity,
          unit: item.unit,
          unitPriceCents: item.unitPriceCents,
          vatPercent: item.vatPercent,
          workHours: item.workHours || undefined,
          areaSqm: item.areaSqm || undefined,
          volumeM3: item.volumeM3 || undefined,
          floor: item.floor || undefined,
          pieces: item.pieces || undefined,
          sortOrder: index,
        })),
        netCents: totals.netCents,
        vatCents: totals.vatCents,
        grossCents: totals.grossCents,
      };

      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Erstellen");
      router.push(`/admin/accounting/invoices/${data.invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Erstellen");
    } finally {
      setLoading(false);
    }
  }

  const referencePreview = Object.values(manualReferences).filter(Boolean).length;
  const serviceDetailPreview = Object.values(serviceDetails).filter(Boolean).length;

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="space-y-6">
        <section className={sectionCls}>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">
                Rechnung Builder
              </div>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                Manuelle Rechnung vollständig steuern
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                Du entscheidest Inhalte, Referenzen, Service-Details, Positionen, Preise und
                Zahlungsbedingungen selbst. Die smarten Felder helfen nur beim schnelleren
                Ausfüllen.
              </p>
            </div>
            <div className="max-w-xs rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Rechnungsnummer mit manuell gesetzten letzten 3 Ziffern. Alles andere in dieser
              Rechnung bleibt frei und individuell.
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className={labelCls}>Rechnungsdatum</label>
              <input
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Zahlungsfrist (Tage)</label>
              <input
                type="number"
                min={1}
                max={90}
                value={dueDays}
                onChange={(e) => setDueDays(Number.parseInt(e.target.value, 10) || 14)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Letzte 3 Ziffern</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={3}
                value={invoiceSuffix}
                onChange={(e) => setInvoiceSuffix(e.target.value.replace(/\D/g, "").slice(0, 3))}
                className={inputCls}
                placeholder="001"
              />
              <div className="mt-1 text-xs text-slate-500">
                Vorschau:{" "}
                <span className="font-semibold text-slate-700">
                  RE-{issuedAt.replaceAll("-", "")}-{invoiceSuffix || "___"}
                </span>
              </div>
            </div>
            <div>
              <label className={labelCls}>Status bei Erstellung</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as InvoicePaymentStatus)}
                className={inputCls}
              >
                <option value="UNPAID">Offen</option>
                <option value="PARTIAL">Teilbezahlt / Anzahlung</option>
                <option value="PAID">Vollständig bezahlt</option>
              </select>
            </div>
          </div>
        </section>

        <section className={sectionCls}>
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-sky-700" />
            <h2 className="text-lg font-bold text-slate-900">Kundendaten</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>E-Mail *</label>
              <input
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Telefon</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Adresse</label>
              <AddressAutocompleteInput
                value={address}
                onValueChange={setAddress}
                onSelect={(next) => setAddress(next?.displayName ?? "")}
                inputClassName={inputCls}
                placeholder="Straße, Hausnummer, PLZ, Ort"
              />
            </div>
          </div>
        </section>

        <section className={sectionCls}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Freie Referenzen</h2>
              <p className="mt-1 text-sm text-slate-500">
                Freie Nummern, Projektnamen oder externer Link. Keine Bindung an bestehende
                Datensätze nötig.
              </p>
            </div>
            <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              {referencePreview} Referenzfelder gefüllt
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className={labelCls}>Auftrag</label>
              <input
                type="text"
                value={manualReferences.orderRef || ""}
                onChange={(e) =>
                  setManualReferences((current) => ({ ...current, orderRef: e.target.value }))
                }
                className={inputCls}
                placeholder="z. B. AUF-20260410-123"
              />
            </div>
            <div>
              <label className={labelCls}>Angebot</label>
              <input
                type="text"
                value={manualReferences.offerRef || ""}
                onChange={(e) =>
                  setManualReferences((current) => ({ ...current, offerRef: e.target.value }))
                }
                className={inputCls}
                placeholder="z. B. ANG-20260410-015"
              />
            </div>
            <div>
              <label className={labelCls}>Vertrag</label>
              <input
                type="text"
                value={manualReferences.contractRef || ""}
                onChange={(e) =>
                  setManualReferences((current) => ({ ...current, contractRef: e.target.value }))
                }
                className={inputCls}
                placeholder="z. B. VER-20260410-015"
              />
            </div>
            <div>
              <label className={labelCls}>Projekt</label>
              <input
                type="text"
                value={manualReferences.projectRef || ""}
                onChange={(e) =>
                  setManualReferences((current) => ({ ...current, projectRef: e.target.value }))
                }
                className={inputCls}
                placeholder="z. B. Villa Wannsee"
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Link / externer Verweis</label>
              <input
                type="url"
                value={manualReferences.externalLink || ""}
                onChange={(e) =>
                  setManualReferences((current) => ({ ...current, externalLink: e.target.value }))
                }
                className={inputCls}
                placeholder="https://..."
              />
            </div>
          </div>
        </section>

        <section className={sectionCls}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Leistungsdetails</h2>
              <p className="mt-1 text-sm text-slate-500">
                Diese Angaben erscheinen nur, wenn du sie wirklich ausfüllst.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    setServiceDetails((current) => ({ ...current, serviceType: preset }))
                  }
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className={labelCls}>Leistungsart</label>
              <input
                type="text"
                value={serviceDetails.serviceType || ""}
                onChange={(e) =>
                  setServiceDetails((current) => ({ ...current, serviceType: e.target.value }))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Einsatzdatum</label>
              <input
                type="date"
                value={serviceDetails.serviceDate || ""}
                onChange={(e) =>
                  setServiceDetails((current) => ({ ...current, serviceDate: e.target.value }))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Arbeitsstunden</label>
              <input
                type="text"
                value={serviceDetails.workHours || ""}
                onChange={(e) =>
                  setServiceDetails((current) => ({ ...current, workHours: e.target.value }))
                }
                className={inputCls}
                placeholder="z. B. 6 Stunden"
              />
            </div>
            <div>
              <label className={labelCls}>Wohnfläche (m²)</label>
              <input
                type="text"
                value={serviceDetails.areaSqm || ""}
                onChange={(e) =>
                  setServiceDetails((current) => ({ ...current, areaSqm: e.target.value }))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Volumen (m³)</label>
              <input
                type="text"
                value={serviceDetails.volumeM3 || ""}
                onChange={(e) =>
                  setServiceDetails((current) => ({ ...current, volumeM3: e.target.value }))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Etage / Zugang</label>
              <input
                type="text"
                value={serviceDetails.floor || ""}
                onChange={(e) =>
                  setServiceDetails((current) => ({ ...current, floor: e.target.value }))
                }
                className={inputCls}
                placeholder="z. B. 4. OG ohne Aufzug"
              />
            </div>
            <div>
              <label className={labelCls}>Aufzug</label>
              <select
                value={serviceDetails.elevator || ""}
                onChange={(e) =>
                  setServiceDetails((current) => ({ ...current, elevator: e.target.value }))
                }
                className={inputCls}
              >
                <option value="">Bitte wählen</option>
                {ELEVATOR_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Startadresse</label>
              <AddressAutocompleteInput
                value={serviceDetails.startAddress || ""}
                onValueChange={(value) =>
                  setServiceDetails((current) => ({ ...current, startAddress: value }))
                }
                onSelect={(next) =>
                  setServiceDetails((current) => ({
                    ...current,
                    startAddress: next?.displayName ?? "",
                  }))
                }
                inputClassName={inputCls}
                placeholder="Startadresse"
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Zieladresse</label>
              <AddressAutocompleteInput
                value={serviceDetails.destinationAddress || ""}
                onValueChange={(value) =>
                  setServiceDetails((current) => ({ ...current, destinationAddress: value }))
                }
                onSelect={(next) =>
                  setServiceDetails((current) => ({
                    ...current,
                    destinationAddress: next?.displayName ?? "",
                  }))
                }
                inputClassName={inputCls}
                placeholder="Zieladresse"
              />
            </div>
            <div className="md:col-span-2 xl:col-span-3">
              <label className={labelCls}>Zusatzinformationen</label>
              <textarea
                rows={3}
                value={serviceDetails.additionalInfo || ""}
                onChange={(e) =>
                  setServiceDetails((current) => ({
                    ...current,
                    additionalInfo: e.target.value,
                  }))
                }
                className={inputCls}
                placeholder="z. B. empfindliche Möbel, Trageweg, enge Einfahrt, spezielle Wünsche"
              />
            </div>
          </div>
        </section>

        <section className={sectionCls}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Positionen</h2>
              <p className="mt-1 text-sm text-slate-500">
                Frei schreibbar, aber mit optionalen Helfern für Stunden, Fläche, Volumen, Etage
                und Stückzahl.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => addItem()}>
                <Plus className="h-4 w-4" />
                Freie Position
              </Button>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {SMART_LINE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  addItem({
                    description: preset.description,
                    detail: preset.detail,
                    unit: preset.unit,
                  })
                }
                className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 transition hover:border-sky-300 hover:bg-sky-100"
              >
                + {preset.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-700 shadow-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800">Position {index + 1}</div>
                      <div className="text-xs text-slate-500">
                        Freie Leistungsposition mit optionalen Zusatzfeldern
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MoveRowButtons
                      onMoveUp={() => moveItem(item.id, -1)}
                      onMoveDown={() => moveItem(item.id, 1)}
                      canMoveUp={index > 0}
                      canMoveDown={index < items.length - 1}
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Entfernen
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-12">
                  <div className="sm:col-span-2 md:col-span-5">
                    <label className={labelCls}>Positionsname *</label>
                    <input
                      type="text"
                      required
                      value={item.description}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      placeholder="z. B. Umzug 4-Zimmer-Wohnung"
                      className={inputCls}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Menge</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, {
                          quantity: Number.parseFloat(e.target.value) || 0,
                        })
                      }
                      className={inputCls}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Einheit</label>
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                      className={inputCls}
                    >
                      <option value="Stück">Stück</option>
                      <option value="Stunde">Stunde</option>
                      <option value="Pauschale">Pauschale</option>
                      <option value="m²">m²</option>
                      <option value="m³">m³</option>
                      <option value="km">km</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className={labelCls}>Preis / Einheit (EUR)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0,00"
                      value={
                        unitPriceDraftById[item.id] ?? centsToUnitPriceField(item.unitPriceCents)
                      }
                      onChange={(e) =>
                        setUnitPriceDraftById((d) => ({ ...d, [item.id]: e.target.value }))
                      }
                      onBlur={(e) => {
                        const cents = euroToCents(e.currentTarget.value);
                        updateItem(item.id, { unitPriceCents: Math.max(0, cents) });
                        setUnitPriceDraftById((d) => {
                          const next = { ...d };
                          delete next[item.id];
                          return next;
                        });
                      }}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className={labelCls}>Zusätzliche Beschreibung für PDF</label>
                  <textarea
                    rows={2}
                    value={item.detail}
                    onChange={(e) => updateItem(item.id, { detail: e.target.value })}
                    className={inputCls}
                    placeholder="z. B. inklusive Verpackung, Trageweg, Schutzmaterial, Zusatzaufwand"
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                  <div>
                    <label className={labelCls}>Arbeitsstunden</label>
                    <input
                      type="text"
                      value={item.workHours}
                      onChange={(e) => updateItem(item.id, { workHours: e.target.value })}
                      className={inputCls}
                      placeholder="6"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Fläche (m²)</label>
                    <input
                      type="text"
                      value={item.areaSqm}
                      onChange={(e) => updateItem(item.id, { areaSqm: e.target.value })}
                      className={inputCls}
                      placeholder="120"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Volumen (m³)</label>
                    <input
                      type="text"
                      value={item.volumeM3}
                      onChange={(e) => updateItem(item.id, { volumeM3: e.target.value })}
                      className={inputCls}
                      placeholder="48"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Etage</label>
                    <input
                      type="text"
                      value={item.floor}
                      onChange={(e) => updateItem(item.id, { floor: e.target.value })}
                      className={inputCls}
                      placeholder="4. OG"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Teile / Stückzahl</label>
                    <input
                      type="text"
                      value={item.pieces}
                      onChange={(e) => updateItem(item.id, { pieces: e.target.value })}
                      className={inputCls}
                      placeholder="12"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>MwSt.</label>
                    <select
                      value={item.vatPercent}
                      onChange={(e) =>
                        updateItem(item.id, { vatPercent: Number.parseFloat(e.target.value) || 19 })
                      }
                      className={inputCls}
                    >
                      <option value={19}>19%</option>
                      <option value={7}>7%</option>
                      <option value={0}>0%</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                    <ArrowUpDown className="h-4 w-4 text-slate-400" />
                    Diese Position erscheint in der PDF mit allen gefüllten Zusatzinfos.
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    Positionssumme: {formatEuro(Math.round(item.quantity * item.unitPriceCents))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={sectionCls}>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-700" />
            <h2 className="text-lg font-bold text-slate-900">Texte, Zahlung und Abschluss</h2>
          </div>

          <div className="grid gap-4">
            <div>
              <label className={labelCls}>Leistungsbeschreibung</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputCls}
                placeholder="Freier Beschreibungstext für die Rechnung"
              />
            </div>

            {(paymentStatus === "PARTIAL" || paymentStatus === "PAID") && (
              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Zahlung bei Erstellung</div>
                    <div className="text-xs text-slate-500">
                      Für Anzahlung oder direkt bezahlte Rechnungen.
                    </div>
                  </div>
                  {paymentStatus === "PARTIAL" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setInitialPaymentEuro((totals.suggestedDepositCents / 100).toFixed(2))
                      }
                    >
                      50% Vorschlag
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className={labelCls}>Betrag (EUR)</label>
                    {paymentStatus === "PAID" ? (
                      <div
                        className={`${inputCls} cursor-not-allowed bg-slate-100 text-slate-800`}
                        aria-readonly="true"
                      >
                        {formatEuro(totals.grossCents)}
                      </div>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="0,00"
                        value={initialPaymentEuro}
                        onChange={(e) => setInitialPaymentEuro(e.target.value)}
                        className={inputCls}
                      />
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Zahlungsart</label>
                    <select
                      value={initialPaymentMethod}
                      onChange={(e) => setInitialPaymentMethod(e.target.value)}
                      className={inputCls}
                    >
                      <option value="BANK_TRANSFER">Überweisung</option>
                      <option value="CASH">Bargeld</option>
                      <option value="CARD">Karte</option>
                      <option value="PAYPAL">PayPal</option>
                      <option value="OTHER">Sonstige</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Referenz</label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="z. B. Echtzeitüberweisung"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
              <div>
                <label className={labelCls}>Rabatt (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number.parseFloat(e.target.value) || 0)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Notizen / Zahlungsbedingungen</label>
                <textarea
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rechnung wird erstellt...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Rechnung erstellen
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/accounting/invoices")}
          >
            Abbrechen
          </Button>
        </div>
      </div>

      <aside className="self-start xl:sticky xl:top-6">
        {/* Collapsible on mobile, always visible on xl */}
        <details className="group xl:open" open>
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-[28px] border border-slate-200 bg-slate-950 px-6 py-4 text-white shadow-[0_24px_70px_rgba(15,23,42,0.24)] xl:hidden [&::-webkit-details-marker]:hidden">
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-[0.24em] text-sky-300">
                Live Vorschau
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                <span className="font-bold text-sky-300">
                  {formatEuro(totals.grossCents)}
                </span>
                <span className="text-slate-400">
                  {items.length} Pos. · RE-{issuedAt.replaceAll("-", "")}-{invoiceSuffix || "___"}
                </span>
              </div>
            </div>
            <span className="ml-3 shrink-0 text-xs font-semibold text-sky-400 transition group-open:rotate-180">
              ▼
            </span>
          </summary>
          <div className="mt-0 rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.24)] xl:mt-0 xl:rounded-[28px] xl:border xl:border-slate-200">
            <div className="hidden text-xs font-bold uppercase tracking-[0.24em] text-sky-300 xl:block">
              Live Vorschau
            </div>
            <h3 className="mt-2 hidden text-2xl font-bold xl:block">Manuelle Rechnung</h3>

            <div className="rounded-3xl bg-white/5 p-4 xl:mt-6">
              <div className="text-sm font-semibold text-white">Rechnungsnummer</div>
              <div className="mt-2 text-lg font-bold text-sky-300">
                RE-{issuedAt.replaceAll("-", "")}-{invoiceSuffix || "___"}
              </div>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Positionen</span>
                <span className="font-semibold">{items.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Referenzen</span>
                <span className="font-semibold">{referencePreview}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Service-Details</span>
                <span className="font-semibold">{serviceDetailPreview}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Zwischensumme</span>
                <span className="font-semibold">{formatEuro(totals.subNetCents)}</span>
              </div>
              {totals.discountCents > 0 && (
                <div className="flex items-center justify-between text-emerald-300">
                  <span>Rabatt ({discountPercent}%)</span>
                  <span className="font-semibold">-{formatEuro(totals.discountCents)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Netto</span>
                <span className="font-semibold">{formatEuro(totals.netCents)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">MwSt.</span>
                <span className="font-semibold">{formatEuro(totals.vatCents)}</span>
              </div>
              <div className="border-t border-white/10 pt-3" />
              <div className="flex items-center justify-between text-lg">
                <span className="font-semibold">Gesamt</span>
                <span className="font-bold text-sky-300">{formatEuro(totals.grossCents)}</span>
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-white/5 p-4">
              <div className="text-sm font-semibold text-white">Zahlungsstatus</div>
              <div className="mt-2 text-sm text-slate-300">
                {paymentStatus === "UNPAID" && "Rechnung startet offen."}
                {paymentStatus === "PARTIAL" &&
                  `Anzahlung: ${formatEuro(totals.parsedInitialPaymentCents)} · Rest: ${formatEuro(totals.remainingCents)}`}
                {paymentStatus === "PAID" && "Rechnung wird direkt als bezahlt gespeichert."}
              </div>
            </div>

            <div className="mt-4 rounded-3xl bg-sky-400/10 p-4 text-sm text-sky-100">
              <div className="flex items-center gap-2 font-semibold">
                <PackagePlus className="h-4 w-4" />
                PDF-Inhalt
              </div>
              <div className="mt-2 leading-6">
                Die PDF übernimmt deine freien Referenzen, Leistungsdetails, Positionsbeschreibungen
                und Zahlungsbedingungen.
              </div>
            </div>

            <div className="mt-4 rounded-3xl bg-amber-400/10 p-4 text-sm text-amber-100">
              <div className="font-semibold">Standard-Hinweis</div>
              <div className="mt-2 leading-6">{DEFAULT_PAYMENT_TERMS}</div>
            </div>
          </div>
        </details>
      </aside>
    </form>
  );
}

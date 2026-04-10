"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { AddressAutocompleteInput } from "@/components/address/address-autocomplete-input";
import { Button } from "@/components/ui/button";

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function euroToCents(value: string): number {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  vatPercent: number;
};

type InvoicePaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

const SMART_LINE_PRESETS = [
  { label: "Umzug pauschal", description: "Umzug pauschal", unit: "Pauschale", priceCents: 0 },
  { label: "Möbelmontage", description: "Möbelmontage", unit: "Stunde", priceCents: 6500 },
  { label: "Halteverbotszone", description: "Halteverbotszone", unit: "Pauschale", priceCents: 12000 },
  { label: "Entsorgung", description: "Entsorgung", unit: "Pauschale", priceCents: 18000 },
  { label: "Verpackungsmaterial", description: "Verpackungsmaterial", unit: "Pauschale", priceCents: 8500 },
];

const DEFAULT_PAYMENT_TERMS =
  "Die Zahlung spätestens 3 Tage vor dem Umzugstag überweisen oder am Umzugstag in Echtzeitüberweisung oder in Bar 50% vor dem Beladen und 50 % vor dem Entladen.";

function newLineItem(preset?: Partial<LineItem>): LineItem {
  return {
    id: crypto.randomUUID(),
    description: preset?.description || "",
    quantity: preset?.quantity ?? 1,
    unit: preset?.unit || "Stück",
    unitPriceCents: preset?.unitPriceCents ?? 0,
    vatPercent: preset?.vatPercent ?? 19,
  };
}

const inputCls =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100";
const labelCls = "mb-1.5 block text-sm font-semibold text-slate-700";
const sectionCls = "rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]";

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
  const [description, setDescription] = useState("Rechnung gemäß vereinbartem Umzugsumfang.");
  const [notes, setNotes] = useState(DEFAULT_PAYMENT_TERMS);
  const [paymentStatus, setPaymentStatus] = useState<InvoicePaymentStatus>("UNPAID");
  const [initialPaymentEuro, setInitialPaymentEuro] = useState("");
  const [initialPaymentMethod, setInitialPaymentMethod] = useState("BANK_TRANSFER");
  const [paymentReference, setPaymentReference] = useState("");

  const [items, setItems] = useState<LineItem[]>([newLineItem()]);
  const [discountPercent, setDiscountPercent] = useState(0);

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

  function addItem(preset?: Partial<LineItem>) {
    setItems((current) => [...current, newLineItem(preset)]);
  }

  function removeItem(id: string) {
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
        items: validItems.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPriceCents: item.unitPriceCents,
          vatPercent: item.vatPercent,
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
      router.push("/admin/accounting/invoices");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Erstellen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <section className={sectionCls}>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">Rechnung</div>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Manuelle Rechnung erstellen</h2>
              <p className="mt-1 text-sm text-slate-600">
                Schnell für Umzüge, Montage, Entsorgung und Zusatzleistungen.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Die letzten 3 Ziffern der Rechnungsnummer können manuell gesetzt werden.
            </div>
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
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-700" />
            <h2 className="text-lg font-bold text-slate-900">Rechnungsdaten</h2>
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
                max={60}
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
                Vorschau: <span className="font-semibold text-slate-700">RE-{issuedAt.replaceAll("-", "")}-{invoiceSuffix || "___"}</span>
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

          {(paymentStatus === "PARTIAL" || paymentStatus === "PAID") && (
            <div className="mt-4 rounded-3xl bg-slate-50 p-4">
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
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      paymentStatus === "PAID"
                        ? (totals.grossCents / 100).toFixed(2)
                        : initialPaymentEuro
                    }
                    onChange={(e) => setInitialPaymentEuro(e.target.value)}
                    disabled={paymentStatus === "PAID"}
                    className={inputCls}
                  />
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
        </section>

        <section className={sectionCls}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Positionen</h2>
              <p className="mt-1 text-sm text-slate-500">
                Intelligente Vorlagen für typische Leistungen einer Umzugsfirma.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => addItem()}>
              <Plus className="h-4 w-4" />
              Position hinzufügen
            </Button>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {SMART_LINE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  addItem({
                    description: preset.description,
                    unit: preset.unit,
                    unitPriceCents: preset.priceCents,
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
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-slate-800">Position {index + 1}</div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Entfernen
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-12">
                  <div className="md:col-span-5">
                    <label className={labelCls}>Beschreibung *</label>
                    <input
                      type="text"
                      required
                      value={item.description}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      placeholder="z. B. Umzug 3-Zimmer-Wohnung"
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
                      <option value="m³">m³</option>
                      <option value="km">km</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className={labelCls}>Preis / Einheit (EUR)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(item.unitPriceCents / 100).toFixed(2)}
                      onChange={(e) =>
                        updateItem(item.id, {
                          unitPriceCents: Math.round(
                            (Number.parseFloat(e.target.value || "0") || 0) * 100,
                          ),
                        })
                      }
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
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
                  <div className="flex items-end">
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm">
                      Positionssumme: {formatEuro(Math.round(item.quantity * item.unitPriceCents))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={sectionCls}>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Beschreibung & Zahlungsbedingungen</h2>
          <div className="grid gap-4">
            <div>
              <label className={labelCls}>Leistungsbeschreibung</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputCls}
              />
            </div>
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
                  rows={4}
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
        <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.24)]">
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-sky-300">Live Vorschau</div>
          <h3 className="mt-2 text-2xl font-bold">Zusammenfassung</h3>

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
            <div className="font-semibold">Standard-Hinweis</div>
            <div className="mt-2 leading-6">{DEFAULT_PAYMENT_TERMS}</div>
          </div>
        </div>
      </aside>
    </form>
  );
}

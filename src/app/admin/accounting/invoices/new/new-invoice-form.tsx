"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { AddressAutocompleteInput } from "@/components/address/address-autocomplete-input";
import { Button } from "@/components/ui/button";

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  vatPercent: number;
};

function newLineItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unit: "Stück",
    unitPriceCents: 0,
    vatPercent: 19,
  };
}

const inputCls =
  "w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none";
const labelCls = "mb-1 block text-sm font-semibold text-slate-700";

export function NewInvoiceForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");

  const [issuedAt, setIssuedAt] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [dueDays, setDueDays] = useState(14);
  const [notes, setNotes] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"UNPAID" | "PAID">("UNPAID");

  const [items, setItems] = useState<LineItem[]>([newLineItem()]);
  const [discountPercent, setDiscountPercent] = useState(0);

  const updateItem = useCallback(
    (id: string, patch: Partial<LineItem>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      return next.length === 0 ? [newLineItem()] : next;
    });
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, newLineItem()]);
  }, []);

  const totals = useMemo(() => {
    let subNetCents = 0;
    let subVatCents = 0;

    const computed = items.map((item) => {
      const lineTotalCents = Math.round(item.quantity * item.unitPriceCents);
      const lineVatCents = Math.round(lineTotalCents * (item.vatPercent / 100));
      subNetCents += lineTotalCents;
      subVatCents += lineVatCents;
      return { ...item, lineTotalCents, lineVatCents };
    });

    const discountCents =
      discountPercent > 0
        ? Math.round(subNetCents * (discountPercent / 100))
        : 0;

    const netCents = subNetCents - discountCents;
    const vatCents = Math.round(
      computed.reduce((sum, c) => {
        const share = c.lineTotalCents / (subNetCents || 1);
        return sum + Math.round((netCents * share * c.vatPercent) / 100);
      }, 0),
    );
    const grossCents = netCents + vatCents;

    return { computed, subNetCents, discountCents, netCents, vatCents, grossCents };
  }, [items, discountPercent]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!customerName || !customerEmail) {
      setError("Name und E-Mail sind Pflichtfelder.");
      setLoading(false);
      return;
    }

    const validItems = items.filter(
      (i) => i.description.trim() && i.unitPriceCents > 0,
    );
    if (validItems.length === 0) {
      setError("Mindestens eine Position mit Beschreibung und Preis ist erforderlich.");
      setLoading(false);
      return;
    }

    try {
      const body = {
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        address: address || undefined,
        description: notes || undefined,
        issuedAt,
        dueDays,
        paymentStatus,
        discountPercent: discountPercent > 0 ? discountPercent : undefined,
        items: validItems.map((item, idx) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPriceCents: item.unitPriceCents,
          vatPercent: item.vatPercent,
          sortOrder: idx,
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
      if (!res.ok) throw new Error(data.error || "Fehler");
      router.push("/admin/accounting/invoices");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Erstellen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* --- Kundeninformationen --- */}
      <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
          Kundeninformationen
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      {/* --- Rechnungsdaten --- */}
      <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
          Rechnungsdaten
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
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
              onChange={(e) => setDueDays(parseInt(e.target.value) || 14)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Zahlungsstatus</label>
            <select
              value={paymentStatus}
              onChange={(e) =>
                setPaymentStatus(e.target.value as "UNPAID" | "PAID")
              }
              className={inputCls}
            >
              <option value="UNPAID">Offen</option>
              <option value="PAID">Bezahlt</option>
            </select>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Rechnungsnummer wird automatisch beim Speichern vergeben.
        </p>
      </div>

      {/* --- Positionen (Items) --- */}
      <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
          Positionen
        </h2>

        <div className="space-y-4">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">
                  Position {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Entfernen
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Beschreibung *
                  </label>
                  <input
                    type="text"
                    required
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, { description: e.target.value })
                    }
                    placeholder="z.B. Umzugsservice 3 Stunden"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Menge
                  </label>
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, {
                        quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Einheit
                  </label>
                  <select
                    value={item.unit}
                    onChange={(e) =>
                      updateItem(item.id, { unit: e.target.value })
                    }
                    className={inputCls}
                  >
                    <option value="Stück">Stück</option>
                    <option value="Stunde">Stunde</option>
                    <option value="Pauschale">Pauschale</option>
                    <option value="m³">m³</option>
                    <option value="km">km</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Preis/Einheit (EUR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={(item.unitPriceCents / 100).toFixed(2)}
                    onChange={(e) =>
                      updateItem(item.id, {
                        unitPriceCents: Math.round(
                          parseFloat(e.target.value || "0") * 100,
                        ),
                      })
                    }
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-6">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    MwSt. %
                  </label>
                  <select
                    value={item.vatPercent}
                    onChange={(e) =>
                      updateItem(item.id, {
                        vatPercent: parseFloat(e.target.value),
                      })
                    }
                    className={inputCls}
                  >
                    <option value={19}>19%</option>
                    <option value={7}>7%</option>
                    <option value={0}>0%</option>
                  </select>
                </div>
                <div className="sm:col-span-2 flex items-end">
                  <div className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-800">
                    Summe:{" "}
                    {formatEuro(
                      Math.round(item.quantity * item.unitPriceCents),
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addItem}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:border-brand-400 hover:text-brand-700"
        >
          <Plus className="h-4 w-4" />
          Position hinzufügen
        </button>
      </div>

      {/* --- Rabatt & Notizen --- */}
      <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
          Rabatt & Notizen
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Rabatt (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={discountPercent}
              onChange={(e) =>
                setDiscountPercent(parseFloat(e.target.value) || 0)
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Notizen / Zahlungsbedingungen</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="z.B. Zahlung innerhalb von 14 Tagen..."
              className={inputCls + " resize-y"}
            />
          </div>
        </div>
      </div>

      {/* --- Summen --- */}
      <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
          Zusammenfassung
        </h2>
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Zwischensumme (netto)</span>
            <span className="font-medium">{formatEuro(totals.subNetCents)}</span>
          </div>
          {totals.discountCents > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Rabatt ({discountPercent}%)</span>
              <span className="font-medium">
                &minus;{formatEuro(totals.discountCents)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Nettobetrag</span>
            <span className="font-medium">{formatEuro(totals.netCents)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">MwSt.</span>
            <span className="font-medium">{formatEuro(totals.vatCents)}</span>
          </div>
          <div className="mt-2 border-t border-slate-200 pt-2" />
          <div className="flex justify-between font-bold text-base">
            <span>Gesamt (brutto)</span>
            <span>{formatEuro(totals.grossCents)}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wird erstellt...
            </>
          ) : (
            "Rechnung erstellen"
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
    </form>
  );
}

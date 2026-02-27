"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Container } from "@/components/container";
import { AddressAutocompleteInput } from "@/components/address/address-autocomplete-input";
import { Button } from "@/components/ui/button";

type ServiceLine = {
  id: string;
  title: string;
  description: string;
  qty: string;
  unitPriceEuro: string;
};

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function euroToCents(euro: string): number {
  const parsed = parseFloat(String(euro).replace(",", "."));
  return Math.round((isNaN(parsed) ? 0 : parsed) * 100);
}

function nextLineId() {
  return Math.random().toString(36).slice(2, 10);
}

export function ManualOfferForm() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<ServiceLine[]>([
    { id: nextLineId(), title: "", description: "", qty: "1", unitPriceEuro: "" },
  ]);
  const [adjustmentEuro, setAdjustmentEuro] = useState("0");

  const [discountType, setDiscountType] = useState<"percent" | "flat">("percent");
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountCentsEuro, setDiscountCentsEuro] = useState("");
  const [discountNote, setDiscountNote] = useState("");

  const [customNote, setCustomNote] = useState("");
  const [validDays, setValidDays] = useState("7");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computed = useMemo(() => {
    const mapped = lines
      .map((line) => {
        const qty = Math.max(0, Number(line.qty) || 0);
        const unitPriceCents = Math.max(0, euroToCents(line.unitPriceEuro));
        const totalCents = qty * unitPriceCents;
        return {
          title: line.title.trim(),
          description: line.description.trim(),
          qty,
          unitPriceCents,
          totalCents,
        };
      })
      .filter((line) => line.title.length >= 2 && line.qty > 0 && line.totalCents > 0);

    const itemsNetCents = mapped.reduce((sum, line) => sum + line.totalCents, 0);
    const adjustmentCents = euroToCents(adjustmentEuro);
    const netCents = Math.max(0, itemsNetCents + adjustmentCents);
    const vatCents = Math.round(netCents * 0.19);
    const grossCents = netCents + vatCents;

    return {
      services: mapped,
      itemsNetCents,
      adjustmentCents,
      netCents,
      vatCents,
      grossCents,
    };
  }, [lines, adjustmentEuro]);

  function updateLine(id: string, patch: Partial<ServiceLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((current) => [...current, { id: nextLineId(), title: "", description: "", qty: "1", unitPriceEuro: "" }]);
  }

  function removeLine(id: string) {
    setLines((current) => (current.length <= 1 ? current : current.filter((line) => line.id !== id)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!computed.services.length) {
        throw new Error("Bitte mindestens eine gültige Position mit Menge und Preis eintragen.");
      }

      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          customerAddress: customerAddress || null,
          description: description || null,
          netCents: computed.netCents,
          vatCents: computed.vatCents,
          grossCents: computed.grossCents,
          discountPercent:
            discountType === "percent" && discountPercent
              ? parseFloat(discountPercent)
              : null,
          discountCents:
            discountType === "flat" && discountCentsEuro
              ? euroToCents(discountCentsEuro)
              : null,
          discountNote: discountNote || null,
          customNote: customNote || null,
          validDays: parseInt(validDays) || 7,
          services: computed.services,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Fehler beim Erstellen");
      }

      router.push("/admin/offers");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none";
  const labelCls = "text-sm font-semibold text-slate-700";

  return (
    <div className="min-h-screen bg-slate-50">
      <Container className="py-8">
        <div className="mb-6">
          <Link
            href="/admin/offers"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            &larr; Zurück zur Übersicht
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Manuelles Angebot erstellen</h1>
          <p className="mt-2 text-slate-600">
            Erstellen Sie ein Angebot ohne zugehörigen Auftrag. Alle Positionen sind frei definierbar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Kundendaten</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>E-Mail *</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Telefon *</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Adresse</label>
                <AddressAutocompleteInput
                  value={customerAddress}
                  onValueChange={setCustomerAddress}
                  onSelect={(next) => setCustomerAddress(next?.displayName ?? "")}
                  inputClassName={inputCls}
                  placeholder="Straße, Hausnummer, PLZ, Ort"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">Leistungspositionen</h2>
              <Button type="button" variant="outline-light" onClick={addLine}>
                <Plus className="h-4 w-4" />
                Position hinzufügen
              </Button>
            </div>

            <div className="grid gap-4">
              {lines.map((line, idx) => {
                const lineTotal = (Math.max(0, Number(line.qty) || 0) * Math.max(0, euroToCents(line.unitPriceEuro)));
                return (
                  <div key={line.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-bold text-slate-800">Position {idx + 1}</div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
                        disabled={lines.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Entfernen
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-12">
                      <div className="md:col-span-4">
                        <label className={labelCls}>Titel *</label>
                        <input
                          type="text"
                          value={line.title}
                          onChange={(e) => updateLine(line.id, { title: e.target.value })}
                          className={inputCls}
                          placeholder="z. B. Umzug 3-Zimmer Wohnung"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className={labelCls}>Menge *</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={line.qty}
                          onChange={(e) => updateLine(line.id, { qty: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className={labelCls}>Einzelpreis (EUR) *</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={line.unitPriceEuro}
                          onChange={(e) => updateLine(line.id, { unitPriceEuro: e.target.value })}
                          className={inputCls}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelCls}>Summe</label>
                        <div className="rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                          {formatEuro(lineTotal)}
                        </div>
                      </div>
                      <div className="md:col-span-12">
                        <label className={labelCls}>Beschreibung (optional)</label>
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => updateLine(line.id, { description: e.target.value })}
                          className={inputCls}
                          placeholder="z. B. inkl. Tragehilfe, Schutzmaterial, Demontage"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Leistungsbeschreibung (global)</h2>
            <label className={labelCls}>Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Allgemeine Hinweise zum Angebot..."
              className={inputCls}
            />
          </div>

          <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Preise</h2>
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <label className={labelCls}>Positionssumme Netto</label>
                <div className="rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                  {formatEuro(computed.itemsNetCents)}
                </div>
              </div>
              <div>
                <label className={labelCls}>Zusatz/Abzug Netto (EUR)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={adjustmentEuro}
                  onChange={(e) => setAdjustmentEuro(e.target.value)}
                  className={inputCls}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className={labelCls}>MwSt. 19%</label>
                <div className="rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                  {formatEuro(computed.vatCents)}
                </div>
              </div>
              <div>
                <label className={labelCls}>Brutto gesamt</label>
                <div className="rounded-lg border-2 border-brand-300 bg-brand-50 px-4 py-2 text-sm font-extrabold text-brand-800">
                  {formatEuro(computed.grossCents)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Rabatt</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Rabattart</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "percent" | "flat")}
                  className={inputCls}
                >
                  <option value="percent">Prozentual</option>
                  <option value="flat">Festbetrag</option>
                </select>
              </div>
              {discountType === "percent" ? (
                <div>
                  <label className={labelCls}>Rabatt (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder="0"
                    className={inputCls}
                  />
                </div>
              ) : (
                <div>
                  <label className={labelCls}>Rabatt (EUR)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={discountCentsEuro}
                    onChange={(e) => setDiscountCentsEuro(e.target.value)}
                    placeholder="0.00"
                    className={inputCls}
                  />
                </div>
              )}
              <div>
                <label className={labelCls}>Rabatthinweis</label>
                <input
                  type="text"
                  value={discountNote}
                  onChange={(e) => setDiscountNote(e.target.value)}
                  placeholder="z. B. Stammkundenrabatt"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Notizen & Gültigkeit</h2>
            <div className="grid gap-4">
              <div>
                <label className={labelCls}>Individuelle Notiz</label>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  rows={3}
                  className={inputCls}
                />
              </div>
              <div className="sm:max-w-xs">
                <label className={labelCls}>Gültigkeitsdauer (Tage)</label>
                <input
                  type="number"
                  min="1"
                  value={validDays}
                  onChange={(e) => setValidDays(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {error}
            </div>
          )}

          <div className="flex items-center gap-4">
            <Button type="submit" variant="primary" size="lg" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Angebot erstellen
            </Button>
            <Link
              href="/admin/offers"
              className="text-sm font-semibold text-slate-600 hover:text-slate-800"
            >
              Abbrechen
            </Link>
          </div>
        </form>
      </Container>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function euroToCents(euro: string): number {
  const parsed = parseFloat(euro.replace(",", "."));
  return Math.round((isNaN(parsed) ? 0 : parsed) * 100);
}

export function ManualOfferForm() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [description, setDescription] = useState("");

  const [netEuro, setNetEuro] = useState("");
  const vatCents = Math.round(euroToCents(netEuro) * 0.19);
  const grossCents = euroToCents(netEuro) + vatCents;

  const [discountType, setDiscountType] = useState<"percent" | "flat">("percent");
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountCentsEuro, setDiscountCentsEuro] = useState("");
  const [discountNote, setDiscountNote] = useState("");

  const [customNote, setCustomNote] = useState("");
  const [validDays, setValidDays] = useState("7");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          customerAddress: customerAddress || null,
          description: description || null,
          netCents: euroToCents(netEuro),
          vatCents,
          grossCents,
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
          services: [],
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
            Erstellen Sie ein Angebot ohne zugehörigen Auftrag.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer info */}
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
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Service description */}
          <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Leistungsbeschreibung</h2>
            <div>
              <label className={labelCls}>Beschreibung</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Beschreibung der angebotenen Leistungen..."
                className={inputCls}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Preise</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Netto (EUR) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={netEuro}
                  onChange={(e) => setNetEuro(e.target.value)}
                  placeholder="0.00"
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>MwSt. 19%</label>
                <div className="rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                  {formatEuro(vatCents)}
                </div>
              </div>
              <div>
                <label className={labelCls}>Brutto</label>
                <div className="rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                  {formatEuro(grossCents)}
                </div>
              </div>
            </div>
          </div>

          {/* Discount */}
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
                  placeholder="z.B. Frühbucherrabatt"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Notes & validity */}
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


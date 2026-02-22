"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function NewInvoiceForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [netEur, setNetEur] = useState("");

  const netCents = Math.round(parseFloat(netEur || "0") * 100);
  const vatCents = Math.round(netCents * 0.19);
  const grossCents = netCents + vatCents;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    const body = {
      customerName: form.get("customerName") as string,
      customerEmail: form.get("customerEmail") as string,
      customerPhone: form.get("customerPhone") as string,
      address: form.get("address") as string,
      description: form.get("description") as string,
      netCents,
      dueDays: parseInt((form.get("dueDays") as string) || "14"),
    };

    if (!body.customerName || !body.customerEmail || netCents <= 0) {
      setError("Name, E-Mail und Betrag sind erforderlich.");
      setLoading(false);
      return;
    }

    try {
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
      <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
          Kundeninformationen
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Name *</label>
            <input
              type="text"
              name="customerName"
              required
              className="w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">E-Mail *</label>
            <input
              type="email"
              name="customerEmail"
              required
              className="w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Telefon</label>
            <input
              type="tel"
              name="customerPhone"
              className="w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Adresse</label>
            <input
              type="text"
              name="address"
              className="w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
          Beschreibung
        </h2>
        <textarea
          name="description"
          rows={3}
          placeholder="Leistungsbeschreibung..."
          className="w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
        />
      </div>

      <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
          Betrag
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Nettobetrag (EUR) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={netEur}
              onChange={(e) => setNetEur(e.target.value)}
              className="w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Zahlungsfrist (Tage)
            </label>
            <input
              type="number"
              name="dueDays"
              defaultValue={14}
              min={1}
              max={90}
              className="w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {netCents > 0 && (
          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Netto</span>
              <span className="font-medium">{formatEuro(netCents)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">MwSt. (19%)</span>
              <span className="font-medium">{formatEuro(vatCents)}</span>
            </div>
            <div className="mt-2 border-t border-slate-200 pt-2" />
            <div className="flex justify-between font-bold">
              <span>Gesamt (brutto)</span>
              <span>{formatEuro(grossCents)}</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
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

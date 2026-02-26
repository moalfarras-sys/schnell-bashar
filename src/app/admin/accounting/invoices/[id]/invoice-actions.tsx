"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatEuro(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function PaymentForm({
  invoiceId,
  outstandingCents,
}: {
  invoiceId: string;
  outstandingCents: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const amountEur = parseFloat((form.get("amount") as string) || "0");
    const amountCents = Math.round(amountEur * 100);
    const method = form.get("method") as string;
    const reference = form.get("reference") as string;
    const notes = form.get("notes") as string;
    const paidAt = form.get("paidAt") as string;

    if (amountCents <= 0) {
      setError("Betrag muss größer als 0 sein.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents, method, reference, notes, paidAt: paidAt || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler");
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Erfassen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">
          Betrag (EUR) <span className="text-slate-400">- offen: {formatEuro(outstandingCents)}</span>
        </label>
        <input
          type="number"
          name="amount"
          step="0.01"
          min="0.01"
          defaultValue={(outstandingCents / 100).toFixed(2)}
          required
          className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Zahlungsart</label>
        <select
          name="method"
          defaultValue="BANK_TRANSFER"
          className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none"
        >
          <option value="BANK_TRANSFER">Überweisung</option>
          <option value="CASH">Bargeld</option>
          <option value="CARD">Karte</option>
          <option value="PAYPAL">PayPal</option>
          <option value="OTHER">Sonstige</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Datum</label>
        <input
          type="date"
          name="paidAt"
          defaultValue={new Date().toISOString().split("T")[0]}
          className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Referenz</label>
        <input
          type="text"
          name="reference"
          placeholder="z.B. Transaktionsnr."
          className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Notiz</label>
        <input
          type="text"
          name="notes"
          placeholder="Optional"
          className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
        />
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      {success && <p className="text-xs font-medium text-green-600">Zahlung erfasst!</p>}

      <Button type="submit" size="sm" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Wird gespeichert...
          </>
        ) : (
          "Zahlung erfassen"
        )}
      </Button>
    </form>
  );
}

export function MarkAsPaidButton({
  invoiceId,
  outstandingCents,
}: {
  invoiceId: string;
  outstandingCents: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleMarkPaid() {
    if (!confirm("Rechnung als vollständig bezahlt markieren?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents: outstandingCents,
          method: "BANK_TRANSFER",
          notes: "Als bezahlt markiert",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler");
      router.refresh();
    } catch {
      alert("Fehler beim Markieren als bezahlt");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1 text-green-600 hover:text-green-700"
      onClick={handleMarkPaid}
      disabled={loading}
    >
      <CheckCircle2 className="h-4 w-4" />
      {loading ? "Wird markiert..." : "Als bezahlt markieren"}
    </Button>
  );
}

export function CancelInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!confirm("Rechnung wirklich stornieren?")) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      router.refresh();
    } catch {
      alert("Fehler beim Stornieren");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1 text-red-600 hover:text-red-700"
      onClick={handleCancel}
      disabled={loading}
    >
      <XCircle className="h-4 w-4" />
      {loading ? "Wird storniert..." : "Stornieren"}
    </Button>
  );
}


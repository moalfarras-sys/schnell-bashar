"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

function euroToCents(euro: string): number {
  const parsed = Number.parseFloat(euro.replace(",", "."));
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function ManualContractForm() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [moveFrom, setMoveFrom] = useState("");
  const [moveTo, setMoveTo] = useState("");
  const [moveDate, setMoveDate] = useState("");
  const [servicesText, setServicesText] = useState("Umzug");
  const [grossEuro, setGrossEuro] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    contractId: string;
    contractNo: string;
    signingUrl: string;
    contractPdfUrl: string;
  } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setResult(null);

    try {
      const services = servicesText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const grossCents = euroToCents(grossEuro);
      const netCents = Math.round(grossCents / 1.19);
      const vatCents = grossCents - netCents;

      const res = await fetch("/api/admin/contracts/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          customerAddress: customerAddress || null,
          moveFrom: moveFrom || null,
          moveTo: moveTo || null,
          moveDate: moveDate ? new Date(moveDate).toISOString() : null,
          services,
          grossCents,
          netCents,
          vatCents,
          notes: notes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Vertrag konnte nicht erstellt werden.");

      setResult({
        contractId: data.contractId,
        contractNo: data.contractNo,
        signingUrl: data.signingUrl,
        contractPdfUrl: data.contractPdfUrl,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Erstellen");
    } finally {
      setSaving(false);
    }
  }

  async function resendSigning(contractId: string) {
    setError(null);
    const res = await fetch(`/api/admin/contracts/manual/${contractId}/send-signing`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Signatur-Link konnte nicht gesendet werden.");
      return;
    }
    setResult((prev) => (prev ? { ...prev, signingUrl: data.signingUrl || prev.signingUrl } : prev));
  }

  const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

  return (
    <Container className="py-8">
      <div className="mb-4">
        <Link href="/admin/offers" className="text-sm font-semibold text-brand-700 hover:underline">
          ← Zurück zu Angebote & Verträge
        </Link>
      </div>

      <h1 className="text-3xl font-extrabold text-slate-900">Neuer Vertrag (manuell)</h1>
      <p className="mt-2 text-sm text-slate-600">Vertrag direkt erstellen, PDF erzeugen und Signatur-Link versenden.</p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Kunde</label>
            <input className={inputCls} value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">E-Mail</label>
            <input className={inputCls} type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Telefon</label>
            <input className={inputCls} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Adresse</label>
            <input className={inputCls} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Termin</label>
            <input className={inputCls} type="datetime-local" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Von</label>
            <input className={inputCls} value={moveFrom} onChange={(e) => setMoveFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Nach</label>
            <input className={inputCls} value={moveTo} onChange={(e) => setMoveTo(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Leistungen (eine pro Zeile)</label>
            <textarea className={inputCls} rows={5} value={servicesText} onChange={(e) => setServicesText(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Notizen</label>
            <textarea className={inputCls} rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="max-w-xs">
          <label className="mb-1 block text-xs font-bold text-slate-600">Endpreis (EUR)</label>
          <input className={inputCls} value={grossEuro} onChange={(e) => setGrossEuro(e.target.value)} required />
        </div>

        {error ? <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>{saving ? "Erstelle..." : "Vertrag erstellen"}</Button>
        </div>
      </form>

      {result && (
        <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-sm">
          <div className="font-bold text-emerald-900">Vertrag {result.contractNo} erstellt.</div>
          <div className="mt-2 break-all">Signatur-Link: <a className="text-brand-700 underline" href={result.signingUrl} target="_blank" rel="noopener noreferrer">öffnen</a></div>
          <div className="mt-1 break-all">PDF: <a className="text-brand-700 underline" href={result.contractPdfUrl} target="_blank" rel="noopener noreferrer">anzeigen</a></div>
          <div className="mt-3 flex gap-3">
            <Button type="button" variant="outline" onClick={() => resendSigning(result.contractId)}>
              Signatur-Link per E-Mail senden
            </Button>
            <Link href="/admin/offers" className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700">
              Zu Angebote & Verträge
            </Link>
          </div>
        </div>
      )}
    </Container>
  );
}

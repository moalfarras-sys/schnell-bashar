"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Category = { id: string; nameDe: string; defaultVatRate: number | null };
type ExpenseRow = {
  id: string;
  date: string;
  vendor: string | null;
  description: string;
  category: { id: string; nameDe: string };
  netCents: number;
  vatRatePercent: number;
  vatCents: number;
  grossCents: number;
  paymentMethod: "CASH" | "BANK" | "CARD" | "OTHER";
  receiptFileUrl: string | null;
};

function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function ExpensesClient(props: { categories: Category[] }) {
  const [items, setItems] = useState<ExpenseRow[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [categoryId, setCategoryId] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    vendor: "",
    description: "",
    categoryId: props.categories[0]?.id ?? "",
    netEuro: "",
    vatRatePercent: props.categories[0]?.defaultVatRate?.toString() ?? "19",
    paymentMethod: "BANK" as "CASH" | "BANK" | "CARD" | "OTHER",
    notes: "",
  });

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, row) => {
          acc.net += row.netCents;
          acc.vat += row.vatCents;
          acc.gross += row.grossCents;
          return acc;
        },
        { net: 0, vat: 0, gross: 0 },
      ),
    [items],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (month) qs.set("month", month);
      if (categoryId) qs.set("categoryId", categoryId);
      if (q.trim()) qs.set("q", q.trim());
      const res = await fetch(`/api/admin/expenses?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Ausgaben konnten nicht geladen werden.");
      setItems((json.rows || []).map((row: ExpenseRow) => ({ ...row, date: String(row.date).slice(0, 10) })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId, month, q]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createEntry() {
    setError(null);
    const netEuro = Number(form.netEuro);
    if (!form.description.trim() || !form.categoryId || !Number.isFinite(netEuro)) {
      setError("Bitte füllen Sie Beschreibung, Kategorie und Netto korrekt aus.");
      return;
    }

    const res = await fetch("/api/admin/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: form.date,
        vendor: form.vendor || null,
        description: form.description.trim(),
        categoryId: form.categoryId,
        netEuro,
        vatRatePercent: Number(form.vatRatePercent || 0),
        paymentMethod: form.paymentMethod,
        receiptFileUrl: receiptUrl || null,
        notes: form.notes || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error || "Speichern fehlgeschlagen.");
      return;
    }

    setForm((prev) => ({ ...prev, description: "", netEuro: "", vendor: "", notes: "" }));
    setReceiptUrl("");
    await load();
  }

  async function deleteEntry(id: string) {
    const res = await fetch(`/api/admin/expenses/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  async function uploadReceipt(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/expenses/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Upload fehlgeschlagen.");
      setReceiptUrl(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Alle Kategorien</option>
            {props.categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nameDe}
              </option>
            ))}
          </select>
          <Input placeholder="Suche (Beschreibung/Lieferant)" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="outline" className="w-full gap-2" onClick={() => void load()} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
              Aktualisieren
            </Button>
            <a href={`/api/admin/expenses/export?month=${encodeURIComponent(month)}`} className="w-full">
              <Button variant="outline" className="w-full gap-2">
                <Download className="h-4 w-4" />
                CSV
              </Button>
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 text-lg font-bold text-slate-900">Neue Ausgabe</div>
        <div className="grid gap-3 md:grid-cols-3">
          <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
          <Input placeholder="Lieferant (optional)" value={form.vendor} onChange={(e) => setForm((p) => ({ ...p, vendor: e.target.value }))} />
          <Input placeholder="Beschreibung" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <select
            value={form.categoryId}
            onChange={(e) => {
              const next = props.categories.find((cat) => cat.id === e.target.value);
              setForm((p) => ({
                ...p,
                categoryId: e.target.value,
                vatRatePercent: next?.defaultVatRate != null ? String(next.defaultVatRate) : p.vatRatePercent,
              }));
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {props.categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nameDe}
              </option>
            ))}
          </select>
          <Input placeholder="Netto (EUR)" value={form.netEuro} onChange={(e) => setForm((p) => ({ ...p, netEuro: e.target.value }))} />
          <Input placeholder="USt-Satz (%)" value={form.vatRatePercent} onChange={(e) => setForm((p) => ({ ...p, vatRatePercent: e.target.value }))} />
          <select
            value={form.paymentMethod}
            onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value as "CASH" | "BANK" | "CARD" | "OTHER" }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="BANK">Bank</option>
            <option value="CASH">Bar</option>
            <option value="CARD">Karte</option>
            <option value="OTHER">Sonstiges</option>
          </select>
          <Input placeholder="Notiz (optional)" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <Upload className="h-4 w-4" />
              {uploading ? "Lädt..." : "Beleg hochladen"}
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadReceipt(file);
                }}
              />
            </label>
            {receiptUrl ? (
              <a href={receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-700 underline">
                Beleg öffnen
              </a>
            ) : null}
          </div>
        </div>
        <div className="mt-3">
          <Button onClick={() => void createEntry()}>Ausgabe speichern</Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-bold text-slate-900">Ausgabenliste</div>
          <div className="text-sm text-slate-600">
            Netto {eur(totals.net)} · USt {eur(totals.vat)} · Brutto {eur(totals.gross)}
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-slate-500">Lade Ausgaben...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-slate-500">Keine Ausgaben für die aktuelle Auswahl.</div>
          ) : (
            items.map((row) => (
              <div key={row.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{row.description}</div>
                    <div className="text-xs text-slate-500">
                      {row.date} · {row.category.nameDe} {row.vendor ? `· ${row.vendor}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm">
                      <div className="font-bold text-slate-900">{eur(row.grossCents)}</div>
                      <div className="text-xs text-slate-500">
                        Netto {eur(row.netCents)} · USt {row.vatRatePercent}%
                      </div>
                    </div>
                    {row.receiptFileUrl ? (
                      <a href={row.receiptFileUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-700 underline">
                        Beleg
                      </a>
                    ) : null}
                    <Button variant="outline" size="sm" className="h-9 w-9 px-0" onClick={() => void deleteEntry(row.id)} title="Löschen">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

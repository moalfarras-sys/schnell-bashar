"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Edit3, RefreshCw, Trash2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Category = { id: string; nameDe: string; defaultVatRate: number | null };
type PaymentMethod = "CASH" | "BANK" | "CARD" | "OTHER";

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
  paymentMethod: PaymentMethod;
  receiptFileUrl: string | null;
  notes?: string | null;
};

type ExpenseListResponse = {
  rows: ExpenseRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: { netCents: number; vatCents: number; grossCents: number };
};

type ExpenseFormState = {
  date: string;
  vendor: string;
  description: string;
  categoryId: string;
  netEuro: string;
  vatRatePercent: string;
  paymentMethod: PaymentMethod;
  notes: string;
};

function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function defaultForm(categories: Category[]): ExpenseFormState {
  return {
    date: new Date().toISOString().slice(0, 10),
    vendor: "",
    description: "",
    categoryId: categories[0]?.id ?? "",
    netEuro: "",
    vatRatePercent: categories[0]?.defaultVatRate?.toString() ?? "19",
    paymentMethod: "BANK",
    notes: "",
  };
}

function parseEuroString(value: string) {
  return Number(value.replace(",", "."));
}

export function ExpensesClient(props: { categories: Category[] }) {
  const [items, setItems] = useState<ExpenseRow[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [categoryId, setCategoryId] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState<ExpenseFormState>(() => defaultForm(props.categories));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ExpenseFormState | null>(null);

  const hasCategories = props.categories.length > 0;

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
      qs.set("page", String(page));
      qs.set("pageSize", "20");

      const res = await fetch(`/api/admin/expenses?${qs.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as ExpenseListResponse & { error?: string };
      if (!res.ok) throw new Error(json?.error || "Ausgaben konnten nicht geladen werden.");

      setItems((json.rows || []).map((row) => ({ ...row, date: String(row.date).slice(0, 10) })));
      setTotalPages(json.totalPages || 1);
      setTotalCount(json.totalCount || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      setItems([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [categoryId, month, page, q]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [month, categoryId, q]);

  useEffect(() => {
    setForm((prev) => {
      if (prev.categoryId || !props.categories[0]) return prev;
      return {
        ...prev,
        categoryId: props.categories[0].id,
        vatRatePercent: props.categories[0].defaultVatRate != null ? String(props.categories[0].defaultVatRate) : prev.vatRatePercent,
      };
    });
  }, [props.categories]);

  async function createEntry() {
    setError(null);
    if (!hasCategories) {
      setError("Es ist keine Ausgabenkategorie vorhanden. Bitte zuerst eine Kategorie anlegen.");
      return;
    }

    const netEuro = parseEuroString(form.netEuro);
    if (!form.description.trim() || !form.categoryId || !Number.isFinite(netEuro) || netEuro < 0) {
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

    setForm(defaultForm(props.categories));
    setReceiptUrl("");
    await load();
  }

  function startEdit(row: ExpenseRow) {
    setEditingId(row.id);
    setEditForm({
      date: row.date,
      vendor: row.vendor ?? "",
      description: row.description,
      categoryId: row.category.id,
      netEuro: (row.netCents / 100).toFixed(2).replace(".", ","),
      vatRatePercent: String(row.vatRatePercent),
      paymentMethod: row.paymentMethod,
      notes: row.notes ?? "",
    });
    setError(null);
  }

  async function saveEdit() {
    if (!editingId || !editForm) return;
    const netEuro = parseEuroString(editForm.netEuro);
    if (!editForm.description.trim() || !editForm.categoryId || !Number.isFinite(netEuro) || netEuro < 0) {
      setError("Bitte füllen Sie Beschreibung, Kategorie und Netto korrekt aus.");
      return;
    }

    const res = await fetch("/api/admin/expenses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        date: editForm.date,
        vendor: editForm.vendor || null,
        description: editForm.description.trim(),
        categoryId: editForm.categoryId,
        netEuro,
        vatRatePercent: Number(editForm.vatRatePercent || 0),
        paymentMethod: editForm.paymentMethod,
        notes: editForm.notes || null,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error || "Aktualisierung fehlgeschlagen.");
      return;
    }

    setEditingId(null);
    setEditForm(null);
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
      {!hasCategories ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Es sind noch keine Ausgabenkategorien vorhanden. Legen Sie zuerst eine Kategorie an unter{" "}
          <Link href="/admin/accounting/expense-categories" className="font-semibold underline">
            Ausgabenkategorien
          </Link>
          .
        </div>
      ) : null}

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
            <a href={`/api/admin/expenses/export?month=${encodeURIComponent(month)}&categoryId=${encodeURIComponent(categoryId)}&q=${encodeURIComponent(q)}`} className="w-full">
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
            <option value="">Kategorie wählen</option>
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
            onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value as PaymentMethod }))}
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
                accept=".pdf,.png,.jpg,.jpeg,.webp"
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
          <Button onClick={() => void createEntry()} disabled={!hasCategories}>Ausgabe speichern</Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-lg font-bold text-slate-900">Ausgabenliste</div>
          <div className="text-sm text-slate-600">
            Seite {page} / {totalPages} · {totalCount} Einträge · Netto {eur(totals.net)} · USt {eur(totals.vat)} · Brutto {eur(totals.gross)}
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-slate-500">Lade Ausgaben...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-slate-500">Keine Ausgaben für die aktuelle Auswahl.</div>
          ) : (
            items.map((row) => {
              const isEditing = row.id === editingId && editForm;
              return (
                <div key={row.id} className="rounded-xl border border-slate-200 p-3">
                  {isEditing ? (
                    <div className="grid gap-2 md:grid-cols-3">
                      <Input type="date" value={editForm.date} onChange={(e) => setEditForm((prev) => (prev ? { ...prev, date: e.target.value } : prev))} />
                      <Input value={editForm.vendor} placeholder="Lieferant" onChange={(e) => setEditForm((prev) => (prev ? { ...prev, vendor: e.target.value } : prev))} />
                      <Input value={editForm.description} placeholder="Beschreibung" onChange={(e) => setEditForm((prev) => (prev ? { ...prev, description: e.target.value } : prev))} />
                      <select
                        value={editForm.categoryId}
                        onChange={(e) => setEditForm((prev) => (prev ? { ...prev, categoryId: e.target.value } : prev))}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        {props.categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.nameDe}</option>
                        ))}
                      </select>
                      <Input value={editForm.netEuro} placeholder="Netto" onChange={(e) => setEditForm((prev) => (prev ? { ...prev, netEuro: e.target.value } : prev))} />
                      <Input value={editForm.vatRatePercent} placeholder="USt %" onChange={(e) => setEditForm((prev) => (prev ? { ...prev, vatRatePercent: e.target.value } : prev))} />
                      <div className="md:col-span-3 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => void saveEdit()}>Speichern</Button>
                        <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditForm(null); }}>
                          <X className="h-4 w-4" />
                          Abbrechen
                        </Button>
                      </div>
                    </div>
                  ) : (
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
                        <Button variant="outline" size="sm" className="h-9 w-9 px-0" onClick={() => startEdit(row)} title="Bearbeiten">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 w-9 px-0" onClick={() => void deleteEntry(row.id)} title="Löschen">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Zurück
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            Weiter
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

type QuarterlyReport = {
  period: { start: string; end: string };
  revenue: { netCents: number; vatCents: number; grossCents: number; paidCents: number };
  expenses: { netCents: number; vatCents: number; grossCents: number };
  ust: { outputVatCents: number; inputVatCents: number; vatPayableCents: number };
  profitBeforeTaxCents: number;
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    count: number;
    netCents: number;
    vatCents: number;
    grossCents: number;
  }>;
  warnings: string[];
  dataSourceNote: string;
};

function formatEuro(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function QuarterlyReportClient({ defaultYear }: { defaultYear: number }) {
  const [year, setYear] = useState(String(defaultYear));
  const [quarter, setQuarter] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<QuarterlyReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ year, quarter });
      const res = await fetch(`/api/admin/accounting/quarterly-report?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Quartalsbericht konnte nicht geladen werden.");
      setReport(json as QuarterlyReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [quarter, year]);

  useEffect(() => {
    void load();
  }, [load]);

  const qs = new URLSearchParams({ year, quarter }).toString();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-slate-700">Jahr</span>
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
              inputMode="numeric"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-slate-700">Quartal</span>
            <select
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="1">Q1</option>
              <option value="2">Q2</option>
              <option value="3">Q3</option>
              <option value="4">Q4</option>
            </select>
          </label>
          <div className="flex items-end gap-2 md:col-span-2">
            <Button className="gap-2" onClick={() => void load()} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
              Bericht laden
            </Button>
            <a href={`/api/admin/accounting/quarterly-report/pdf?${qs}`} target="_blank" rel="noreferrer">
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                PDF
              </Button>
            </a>
            <a href={`/api/admin/accounting/quarterly-report/csv?${qs}`}>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                CSV
              </Button>
            </a>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {loading && !report ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">Lade Bericht...</div>
      ) : null}

      {report ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Umsatz Netto</div>
              <div className="mt-2 text-xl font-bold text-slate-900">{formatEuro(report.revenue.netCents)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ausgaben Netto</div>
              <div className="mt-2 text-xl font-bold text-slate-900">{formatEuro(report.expenses.netCents)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">USt-Zahllast</div>
              <div className="mt-2 text-xl font-bold text-slate-900">{formatEuro(report.ust.vatPayableCents)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vorläufiges Ergebnis</div>
              <div className="mt-2 text-xl font-bold text-slate-900">{formatEuro(report.profitBeforeTaxCents)}</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Ausgabenkategorien</h2>
            <div className="mt-3 space-y-2">
              {report.byCategory.length === 0 ? (
                <div className="text-sm text-slate-500">Keine Ausgaben im ausgewählten Zeitraum.</div>
              ) : (
                report.byCategory.map((item) => (
                  <div key={item.categoryId} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <div className="text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">{item.categoryName}</span> · {item.count} Einträge
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{formatEuro(item.grossCents)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">Anmerkungen / Datenquelle</h2>
            <p className="mt-2 text-sm text-slate-700">{report.dataSourceNote}</p>
            {report.warnings.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-700">
                {report.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

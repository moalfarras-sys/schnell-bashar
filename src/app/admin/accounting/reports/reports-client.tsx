"use client";

import { Button } from "@/components/ui/button";
import { Download, Truck, Recycle, Wrench, Package } from "lucide-react";

interface MonthRow {
  month: string;
  invoiceCount: number;
  totalGross: number;
  totalNet: number;
  totalVat: number;
  totalPaid: number;
  paidCount: number;
  unpaidCount: number;
  outstanding: number;
}

interface Totals {
  invoiceCount: number;
  totalGross: number;
  totalNet: number;
  totalVat: number;
  totalPaid: number;
  paidCount: number;
  unpaidCount: number;
  overdueCount: number;
}

interface ServiceBreakdown {
  moving: number;
  disposal: number;
  both: number;
  other: number;
}

function eur(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function ReportsClient({
  year,
  monthlyReport,
  totals,
  serviceBreakdown,
}: {
  year: number;
  monthlyReport: MonthRow[];
  totals: Totals;
  serviceBreakdown: ServiceBreakdown;
}) {
  function exportCSV() {
    const header = "Monat;Rechnungen;Brutto;Netto;MwSt;Bezahlt;Offen;Bezahlt (Anz.);Offen (Anz.)";
    const rows = monthlyReport.map(
      (r) =>
        `${r.month};${r.invoiceCount};${(r.totalGross / 100).toFixed(2)};${(r.totalNet / 100).toFixed(2)};${(r.totalVat / 100).toFixed(2)};${(r.totalPaid / 100).toFixed(2)};${(r.outstanding / 100).toFixed(2)};${r.paidCount};${r.unpaidCount}`,
    );
    const totalRow = `GESAMT;${totals.invoiceCount};${(totals.totalGross / 100).toFixed(2)};${(totals.totalNet / 100).toFixed(2)};${(totals.totalVat / 100).toFixed(2)};${(totals.totalPaid / 100).toFixed(2)};${((totals.totalGross - totals.totalPaid) / 100).toFixed(2)};${totals.paidCount};${totals.unpaidCount}`;

    const csv = [header, ...rows, "", totalRow].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Buchhaltung_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const serviceTotal =
    serviceBreakdown.moving + serviceBreakdown.disposal + serviceBreakdown.both + serviceBreakdown.other;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="text-sm font-semibold text-blue-800">Gesamtumsatz (brutto)</div>
          <div className="mt-1 text-2xl font-bold text-blue-900">{eur(totals.totalGross)}</div>
        </div>
        <div className="rounded-xl border-2 border-green-200 bg-green-50 p-5 shadow-sm">
          <div className="text-sm font-semibold text-green-800">Bezahlt</div>
          <div className="mt-1 text-2xl font-bold text-green-900">{eur(totals.totalPaid)}</div>
          <div className="text-xs text-green-700">{totals.paidCount} Rechnungen</div>
        </div>
        <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-5 shadow-sm">
          <div className="text-sm font-semibold text-orange-800">Offen</div>
          <div className="mt-1 text-2xl font-bold text-orange-900">{eur(totals.totalGross - totals.totalPaid)}</div>
          <div className="text-xs text-orange-700">{totals.unpaidCount} Rechnungen</div>
        </div>
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="text-sm font-semibold text-red-800">Überfällig</div>
          <div className="mt-1 text-2xl font-bold text-red-900">{totals.overdueCount}</div>
          <div className="text-xs text-red-700">Rechnungen</div>
        </div>
      </div>

      {serviceTotal > 0 && (
        <div className="rounded-xl border-2 border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
            Umsatz nach Leistungsart
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ServiceCard icon={Truck} label="Umzug" amount={serviceBreakdown.moving} total={serviceTotal} />
            <ServiceCard icon={Recycle} label="Entsorgung" amount={serviceBreakdown.disposal} total={serviceTotal} />
            <ServiceCard icon={Package} label="Umzug + Entsorgung" amount={serviceBreakdown.both} total={serviceTotal} />
            <ServiceCard icon={Wrench} label="Sonstige" amount={serviceBreakdown.other} total={serviceTotal} />
          </div>
        </div>
      )}

      <div className="rounded-xl border-2 border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Monatliche Übersicht — {year}</h2>
          <Button variant="outline" size="sm" className="gap-1" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" />
            CSV Export
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Monat</th>
                <th className="px-4 py-3 text-right">Rechnungen</th>
                <th className="px-4 py-3 text-right">Brutto</th>
                <th className="px-4 py-3 text-right">Netto</th>
                <th className="px-4 py-3 text-right">MwSt.</th>
                <th className="px-4 py-3 text-right">Bezahlt</th>
                <th className="px-4 py-3 text-right">Offen</th>
              </tr>
            </thead>
            <tbody>
              {monthlyReport.map((row) => (
                <tr key={row.month} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-6 py-3 font-semibold text-slate-900">{row.month}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{row.invoiceCount}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{eur(row.totalGross)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{eur(row.totalNet)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{eur(row.totalVat)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{eur(row.totalPaid)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${row.outstanding > 0 ? "text-red-600" : "text-slate-400"}`}>
                    {eur(row.outstanding)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                <td className="px-6 py-3 text-slate-900">GESAMT</td>
                <td className="px-4 py-3 text-right text-slate-900">{totals.invoiceCount}</td>
                <td className="px-4 py-3 text-right text-slate-900">{eur(totals.totalGross)}</td>
                <td className="px-4 py-3 text-right text-slate-700">{eur(totals.totalNet)}</td>
                <td className="px-4 py-3 text-right text-slate-700">{eur(totals.totalVat)}</td>
                <td className="px-4 py-3 text-right text-green-600">{eur(totals.totalPaid)}</td>
                <td className="px-4 py-3 text-right text-red-600">{eur(totals.totalGross - totals.totalPaid)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({
  icon: Icon,
  label,
  amount,
  total,
}: {
  icon: any;
  label: string;
  amount: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4">
      <Icon className="h-5 w-5 text-brand-500" />
      <div className="flex-1">
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        <div className="text-xs text-slate-500">{pct}% Anteil</div>
      </div>
      <div className="text-sm font-bold text-slate-900">{eur(amount)}</div>
    </div>
  );
}

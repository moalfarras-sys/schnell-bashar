"use client";

import { useState } from "react";
import { CalendarDays, Download, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

type AvailabilityResponse = {
  ok: boolean;
  zone?: { id: string; name: string };
  slots?: Array<{ date: string; from: string; to: string; serviceType: string; zone: string }>;
  note?: string;
  error?: string;
};

export function KalenderClient() {
  const [postalCode, setPostalCode] = useState("");
  const [serviceType, setServiceType] = useState<"MOVING" | "MONTAGE" | "ENTSORGUNG">("MOVING");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AvailabilityResponse["slots"]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [publicId, setPublicId] = useState("");

  async function searchAvailability() {
    if (!/^\d{5}$/.test(postalCode)) {
      setNote("Bitte eine gültige PLZ eingeben (5-stellig).");
      return;
    }
    setLoading(true);
    setNote(null);
    try {
      const res = await fetch(
        `/api/calendar/availability?postalCode=${encodeURIComponent(postalCode)}&serviceType=${encodeURIComponent(serviceType)}&days=30`,
      );
      const data = (await res.json()) as AvailabilityResponse;
      if (!res.ok) throw new Error(data.error || "Kalender konnte nicht geladen werden.");
      setRows(data.slots ?? []);
      setNote(data.note ?? null);
    } catch (error) {
      setRows([]);
      setNote(error instanceof Error ? error.message : "Kalender konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 rounded-3xl border border-[color:var(--line-soft)] bg-[color:var(--surface-elevated)] p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            PLZ
          </label>
          <input
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="12043"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Service
          </label>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value as any)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="MOVING">Umzug</option>
            <option value="MONTAGE">Montage</option>
            <option value="ENTSORGUNG">Entsorgung</option>
          </select>
        </div>
        <div className="md:col-span-2 md:self-end">
          <Button onClick={searchAvailability} disabled={loading} className="w-full gap-2 md:w-auto">
            <Search className="h-4 w-4" />
            {loading ? "Wird geladen..." : "Verfügbarkeit prüfen"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2 font-bold">Datum</th>
              <th className="px-3 py-2 font-bold">Zeitfenster</th>
              <th className="px-3 py-2 font-bold">Service</th>
            </tr>
          </thead>
          <tbody>
            {rows && rows.length > 0 ? (
              rows.slice(0, 15).map((r, idx) => (
                <tr key={`${r.date}-${r.from}-${idx}`} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-3 py-2">{r.date}</td>
                  <td className="px-3 py-2">{r.from} - {r.to} Uhr</td>
                  <td className="px-3 py-2">{r.serviceType}</td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-slate-200 dark:border-slate-700">
                <td colSpan={3} className="px-3 py-4 text-slate-500 dark:text-slate-400">
                  Noch keine Daten. Bitte PLZ und Service auswählen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="text-sm font-bold text-slate-800 dark:text-slate-100">ICS für bestehenden Auftrag</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={publicId}
            onChange={(e) => setPublicId(e.target.value)}
            placeholder="Auftrags-ID (z. B. AUF-...)"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <a
            href={publicId.trim() ? `/api/calendar/ics?publicId=${encodeURIComponent(publicId.trim())}` : "#"}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <Download className="h-4 w-4" />
            ICS herunterladen
          </a>
        </div>
      </div>

      {note ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 dark:border-brand-900/50 dark:bg-brand-950/30 dark:text-brand-300">
          {note}
        </div>
      ) : null}

      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <CalendarDays className="h-3.5 w-3.5" />
        Termine können sich an Feiertagen oder durch Routenoptimierung ändern.
      </div>
    </div>
  );
}

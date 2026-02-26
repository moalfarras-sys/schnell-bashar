"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Download, RefreshCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type AvailabilityResponse = {
  ok: boolean;
  zone?: { id: string; name: string };
  slots?: Array<{ date: string; from: string; to: string; serviceType: string; zone: string }>;
  note?: string;
  error?: string;
};

type FetchState = "idle" | "loading" | "success" | "empty" | "error";

function SlotsSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
      <div className="grid grid-cols-3 gap-3 bg-slate-100 px-3 py-2 dark:bg-slate-800">
        <div className="h-4 animate-pulse rounded bg-slate-300/70 dark:bg-slate-600/70" />
        <div className="h-4 animate-pulse rounded bg-slate-300/70 dark:bg-slate-600/70" />
        <div className="h-4 animate-pulse rounded bg-slate-300/70 dark:bg-slate-600/70" />
      </div>
      <div className="space-y-2 p-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="grid grid-cols-3 gap-3">
            <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function KalenderClient() {
  const [postalCode, setPostalCode] = useState("");
  const [serviceType, setServiceType] = useState<"MOVING" | "MONTAGE" | "ENTSORGUNG">("MOVING");
  const [state, setState] = useState<FetchState>("idle");
  const [rows, setRows] = useState<AvailabilityResponse["slots"]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [publicId, setPublicId] = useState("");

  const hasRows = useMemo(() => (rows?.length ?? 0) > 0, [rows]);

  async function searchAvailability() {
    if (!/^\d{5}$/.test(postalCode)) {
      setState("error");
      setNote("Bitte eine gültige PLZ eingeben (5-stellig).");
      return;
    }

    setState("loading");
    setNote(null);

    try {
      const res = await fetch(
        `/api/calendar/availability?postalCode=${encodeURIComponent(postalCode)}&serviceType=${encodeURIComponent(serviceType)}&days=30`,
      );
      const data = (await res.json()) as AvailabilityResponse;
      if (!res.ok) throw new Error(data.error || "Kalender konnte nicht geladen werden.");

      setRows(data.slots ?? []);
      setNote(data.note ?? null);
      setState((data.slots?.length ?? 0) > 0 ? "success" : "empty");
    } catch (error) {
      setRows([]);
      setState("error");
      setNote(error instanceof Error ? error.message : "Kalender konnte nicht geladen werden.");
    }
  }

  return (
    <div className="grid gap-6 rounded-3xl border border-[color:var(--line-soft)] bg-[color:var(--surface-elevated)] p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            PLZ
          </label>
          <Input
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
            placeholder="12043"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Service
          </label>
          <Select value={serviceType} onChange={(e) => setServiceType(e.target.value as any)}>
            <option value="MOVING">Umzug</option>
            <option value="MONTAGE">Montage</option>
            <option value="ENTSORGUNG">Entsorgung</option>
          </Select>
        </div>
        <div className="md:col-span-2 md:self-end">
          <Button onClick={searchAvailability} disabled={state === "loading"} className="w-full gap-2 md:w-auto">
            <Search className="h-4 w-4" />
            {state === "loading" ? "Verfügbarkeit wird geladen..." : "Verfügbarkeit prüfen"}
          </Button>
        </div>
      </div>

      {state === "loading" ? (
        <SlotsSkeleton />
      ) : hasRows ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100">Datum</th>
                <th className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100">Zeitfenster</th>
                <th className="px-3 py-2 font-bold text-slate-900 dark:text-slate-100">Service</th>
              </tr>
            </thead>
            <tbody>
              {rows?.slice(0, 15).map((r, idx) => (
                <tr key={`${r.date}-${r.from}-${idx}`} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{r.date}</td>
                  <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{r.from} - {r.to} Uhr</td>
                  <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{r.serviceType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : state === "empty" ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/20 dark:text-amber-200">
          <div className="font-bold">Keine freien Zeitfenster gefunden.</div>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
            Bitte wählen Sie einen anderen Zeitraum oder kontaktieren Sie uns direkt für eine schnelle Terminabstimmung.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a className="inline-flex items-center justify-center rounded-xl bg-amber-700 px-3 py-2 text-xs font-bold text-white hover:bg-amber-800" href="tel:+491729573681">
              Jetzt anrufen
            </a>
            <a className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700" href="https://wa.me/491729573681" target="_blank" rel="noreferrer">
              WhatsApp öffnen
            </a>
          </div>
        </div>
      ) : state === "error" ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 dark:border-red-500/40 dark:bg-red-950/20">
          <div className="flex items-start gap-2 text-red-900 dark:text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div>
              <div className="font-bold">Kalender konnte nicht geladen werden.</div>
              <p className="mt-1 text-sm">{note ?? "Bitte versuchen Sie es erneut."}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={searchAvailability}>
            <RefreshCcw className="h-4 w-4" />
            Erneut versuchen
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          Noch keine Daten. Bitte PLZ und Service auswählen.
        </div>
      )}

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">ICS für bestehenden Auftrag</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={publicId}
            onChange={(e) => setPublicId(e.target.value)}
            placeholder="Auftrags-ID (z. B. AUF-...)"
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

      {note && state !== "error" ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 dark:border-brand-900/50 dark:bg-brand-950/30 dark:text-brand-300">
          {note}
        </div>
      ) : null}

      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
        <CalendarDays className="h-3.5 w-3.5" />
        Termine können sich an Feiertagen oder durch Routenoptimierung ändern.
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";

type CalendarState = {
  zones: Array<{ id: string; name: string; postalCodes: string[]; active: boolean }>;
  rules: Array<{
    id: string;
    zoneId: string;
    serviceType: "MOVING" | "MONTAGE" | "ENTSORGUNG";
    weekday: number;
    from: string;
    to: string;
    active: boolean;
  }>;
  exceptions: Array<{
    id: string;
    zoneId?: string;
    serviceType?: "MOVING" | "MONTAGE" | "ENTSORGUNG";
    date: string;
    closed: boolean;
    note?: string;
  }>;
};

export function CalendarAdminClient({ initial }: { initial: CalendarState }) {
  const [zonesText, setZonesText] = useState(() => JSON.stringify(initial.zones, null, 2));
  const [rulesText, setRulesText] = useState(() => JSON.stringify(initial.rules, null, 2));
  const [exceptionsText, setExceptionsText] = useState(() => JSON.stringify(initial.exceptions, null, 2));
  const [saving, setSaving] = useState<null | "zones" | "rules" | "exceptions">(null);
  const [status, setStatus] = useState<string | null>(null);

  const hints = useMemo(
    () => [
      "weekday: 0=Sonntag ... 6=Samstag",
      "serviceType: MOVING | MONTAGE | ENTSORGUNG",
      "Zeitformat: HH:mm (z. B. 08:30)",
      "Exceptions date: YYYY-MM-DD",
    ],
    [],
  );

  async function saveJson(
    endpoint: "/api/admin/calendar/zones" | "/api/admin/calendar/rules" | "/api/admin/calendar/exceptions",
    value: string,
    key: "zones" | "rules" | "exceptions",
  ) {
    setSaving(key);
    setStatus(null);
    try {
      const parsed = JSON.parse(value);
      const payload = key === "zones" ? { zones: parsed } : key === "rules" ? { rules: parsed } : { exceptions: parsed };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Speichern fehlgeschlagen");
      }
      const data = await res.json();
      if (key === "zones") setZonesText(JSON.stringify(data.zones ?? parsed, null, 2));
      if (key === "rules") setRulesText(JSON.stringify(data.rules ?? parsed, null, 2));
      if (key === "exceptions") setExceptionsText(JSON.stringify(data.exceptions ?? parsed, null, 2));
      setStatus("Kalenderdaten gespeichert.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <h1 className="text-xl font-bold text-white">Abholkalender verwalten</h1>
        <p className="mt-1 text-sm text-slate-300">
          Zonen, Regeln und Ausnahmen steuern die öffentliche Verfügbarkeitsanzeige.
        </p>
        <ul className="mt-3 list-disc pl-5 text-xs text-slate-400">
          {hints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </section>

      <EditorCard
        title="Zonen (PLZ-Gebiete)"
        value={zonesText}
        onChange={setZonesText}
        onSave={() => saveJson("/api/admin/calendar/zones", zonesText, "zones")}
        loading={saving === "zones"}
      />

      <EditorCard
        title="Regeln (Wochentag + Zeitfenster)"
        value={rulesText}
        onChange={setRulesText}
        onSave={() => saveJson("/api/admin/calendar/rules", rulesText, "rules")}
        loading={saving === "rules"}
      />

      <EditorCard
        title="Ausnahmen (Feiertage / Sperren)"
        value={exceptionsText}
        onChange={setExceptionsText}
        onSave={() => saveJson("/api/admin/calendar/exceptions", exceptionsText, "exceptions")}
        loading={saving === "exceptions"}
      />

      {status ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm text-slate-200">
          {status}
        </div>
      ) : null}
    </div>
  );
}

function EditorCard(props: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  loading: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">{props.title}</h2>
        <button
          type="button"
          onClick={props.onSave}
          disabled={props.loading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
        >
          {props.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Speichern
        </button>
      </div>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        rows={12}
        className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100"
      />
    </section>
  );
}

"use client";

import { useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

type Zone = { id: string; name: string; postalCodes: string[]; active: boolean };
type Rule = {
  id: string;
  zoneId: string;
  serviceType: "MOVING" | "MONTAGE" | "ENTSORGUNG";
  weekday: number;
  from: string;
  to: string;
  active: boolean;
};
type Exception = {
  id: string;
  zoneId?: string;
  serviceType?: "MOVING" | "MONTAGE" | "ENTSORGUNG";
  date: string;
  closed: boolean;
  note?: string;
};

type CalendarState = { zones: Zone[]; rules: Rule[]; exceptions: Exception[] };

const WEEKDAYS = [
  { value: 1, label: "Montag" },
  { value: 2, label: "Dienstag" },
  { value: 3, label: "Mittwoch" },
  { value: 4, label: "Donnerstag" },
  { value: 5, label: "Freitag" },
  { value: 6, label: "Samstag" },
  { value: 0, label: "Sonntag" },
] as const;

const SERVICE_TYPES = ["MOVING", "MONTAGE", "ENTSORGUNG"] as const;
const SERVICE_LABELS: Record<string, string> = {
  MOVING: "Umzug",
  MONTAGE: "Montage",
  ENTSORGUNG: "Entsorgung",
};

function uid() {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const inputCls =
  "w-full rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const selectCls =
  "w-full rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const toggleCls =
  "relative h-5 w-9 cursor-pointer appearance-none rounded-full bg-slate-600 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform checked:bg-blue-500 checked:after:translate-x-4";

export function CalendarAdminClient({ initial }: { initial: CalendarState }) {
  const [zones, setZones] = useState<Zone[]>(() => initial.zones ?? []);
  const [rules, setRules] = useState<Rule[]>(() => initial.rules ?? []);
  const [exceptions, setExceptions] = useState<Exception[]>(() => initial.exceptions ?? []);
  const [saving, setSaving] = useState<null | "zones" | "rules" | "exceptions">(null);
  const [status, setStatus] = useState<string | null>(null);

  async function saveSection(
    endpoint: string,
    key: "zones" | "rules" | "exceptions",
    data: Zone[] | Rule[] | Exception[],
  ) {
    setSaving(key);
    setStatus(null);
    try {
      const payload = { [key]: data };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Speichern fehlgeschlagen");
      }
      const result = await res.json();
      if (key === "zones" && result.zones) setZones(result.zones);
      if (key === "rules" && result.rules) setRules(result.rules);
      if (key === "exceptions" && result.exceptions) setExceptions(result.exceptions);
      setStatus(`${key === "zones" ? "Zonen" : key === "rules" ? "Regeln" : "Ausnahmen"} gespeichert.`);
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
      </section>

      {/* ── Zones ── */}
      <SectionCard
        title="Zonen (PLZ-Gebiete)"
        saving={saving === "zones"}
        onSave={() => saveSection("/api/admin/calendar/zones", "zones", zones)}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="pb-2 pr-3">Name</th>
                <th className="pb-2 pr-3">Postleitzahlen</th>
                <th className="pb-2 pr-3 text-center">Aktiv</th>
                <th className="pb-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {zones.map((zone, i) => (
                <tr key={zone.id} className="group">
                  <td className="py-2 pr-3">
                    <input
                      className={inputCls}
                      value={zone.name}
                      placeholder="z.B. Berlin Kerngebiet"
                      onChange={(e) => {
                        const next = [...zones];
                        next[i] = { ...zone, name: e.target.value };
                        setZones(next);
                      }}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className={inputCls}
                      value={zone.postalCodes.join(", ")}
                      placeholder="10115, 10243, 10961"
                      onChange={(e) => {
                        const next = [...zones];
                        next[i] = {
                          ...zone,
                          postalCodes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        };
                        setZones(next);
                      }}
                    />
                  </td>
                  <td className="py-2 pr-3 text-center">
                    <input
                      type="checkbox"
                      className={toggleCls}
                      checked={zone.active}
                      onChange={(e) => {
                        const next = [...zones];
                        next[i] = { ...zone, active: e.target.checked };
                        setZones(next);
                      }}
                    />
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/20 hover:text-red-400"
                      onClick={() => setZones(zones.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {zones.length === 0 && (
          <p className="mt-3 text-center text-sm text-slate-500">Keine Zonen definiert.</p>
        )}
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-blue-500 hover:text-blue-400"
          onClick={() =>
            setZones([...zones, { id: uid(), name: "", postalCodes: [], active: true }])
          }
        >
          <Plus className="h-3.5 w-3.5" /> Zone hinzufügen
        </button>
      </SectionCard>

      {/* ── Rules ── */}
      <SectionCard
        title="Regeln (Wochentag + Zeitfenster)"
        saving={saving === "rules"}
        onSave={() => saveSection("/api/admin/calendar/rules", "rules", rules)}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="pb-2 pr-3">Zone</th>
                <th className="pb-2 pr-3">Service</th>
                <th className="pb-2 pr-3">Wochentag</th>
                <th className="pb-2 pr-3">Von</th>
                <th className="pb-2 pr-3">Bis</th>
                <th className="pb-2 pr-3 text-center">Aktiv</th>
                <th className="pb-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {rules.map((rule, i) => (
                <tr key={rule.id} className="group">
                  <td className="py-2 pr-3">
                    <select
                      className={selectCls}
                      value={rule.zoneId}
                      onChange={(e) => {
                        const next = [...rules];
                        next[i] = { ...rule, zoneId: e.target.value };
                        setRules(next);
                      }}
                    >
                      <option value="">– Zone –</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name || z.id}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      className={selectCls}
                      value={rule.serviceType}
                      onChange={(e) => {
                        const next = [...rules];
                        next[i] = { ...rule, serviceType: e.target.value as Rule["serviceType"] };
                        setRules(next);
                      }}
                    >
                      {SERVICE_TYPES.map((st) => (
                        <option key={st} value={st}>
                          {SERVICE_LABELS[st]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      className={selectCls}
                      value={rule.weekday}
                      onChange={(e) => {
                        const next = [...rules];
                        next[i] = { ...rule, weekday: Number(e.target.value) };
                        setRules(next);
                      }}
                    >
                      {WEEKDAYS.map((wd) => (
                        <option key={wd.value} value={wd.value}>
                          {wd.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="time"
                      className={inputCls}
                      value={rule.from}
                      onChange={(e) => {
                        const next = [...rules];
                        next[i] = { ...rule, from: e.target.value };
                        setRules(next);
                      }}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="time"
                      className={inputCls}
                      value={rule.to}
                      onChange={(e) => {
                        const next = [...rules];
                        next[i] = { ...rule, to: e.target.value };
                        setRules(next);
                      }}
                    />
                  </td>
                  <td className="py-2 pr-3 text-center">
                    <input
                      type="checkbox"
                      className={toggleCls}
                      checked={rule.active}
                      onChange={(e) => {
                        const next = [...rules];
                        next[i] = { ...rule, active: e.target.checked };
                        setRules(next);
                      }}
                    />
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/20 hover:text-red-400"
                      onClick={() => setRules(rules.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rules.length === 0 && (
          <p className="mt-3 text-center text-sm text-slate-500">Keine Regeln definiert.</p>
        )}
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-blue-500 hover:text-blue-400"
          onClick={() =>
            setRules([
              ...rules,
              {
                id: uid(),
                zoneId: zones[0]?.id ?? "",
                serviceType: "MOVING",
                weekday: 1,
                from: "08:00",
                to: "18:00",
                active: true,
              },
            ])
          }
        >
          <Plus className="h-3.5 w-3.5" /> Regel hinzufügen
        </button>
      </SectionCard>

      {/* ── Exceptions ── */}
      <SectionCard
        title="Ausnahmen (Feiertage / Sperren)"
        saving={saving === "exceptions"}
        onSave={() => saveSection("/api/admin/calendar/exceptions", "exceptions", exceptions)}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="pb-2 pr-3">Datum</th>
                <th className="pb-2 pr-3">Zone</th>
                <th className="pb-2 pr-3">Service</th>
                <th className="pb-2 pr-3 text-center">Gesperrt</th>
                <th className="pb-2 pr-3">Notiz</th>
                <th className="pb-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {exceptions.map((exc, i) => (
                <tr key={exc.id} className="group">
                  <td className="py-2 pr-3">
                    <input
                      type="date"
                      className={inputCls}
                      value={exc.date}
                      onChange={(e) => {
                        const next = [...exceptions];
                        next[i] = { ...exc, date: e.target.value };
                        setExceptions(next);
                      }}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      className={selectCls}
                      value={exc.zoneId ?? ""}
                      onChange={(e) => {
                        const next = [...exceptions];
                        next[i] = { ...exc, zoneId: e.target.value || undefined };
                        setExceptions(next);
                      }}
                    >
                      <option value="">Alle Zonen</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name || z.id}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      className={selectCls}
                      value={exc.serviceType ?? ""}
                      onChange={(e) => {
                        const next = [...exceptions];
                        next[i] = {
                          ...exc,
                          serviceType: (e.target.value as Exception["serviceType"]) || undefined,
                        };
                        setExceptions(next);
                      }}
                    >
                      <option value="">Alle Services</option>
                      {SERVICE_TYPES.map((st) => (
                        <option key={st} value={st}>
                          {SERVICE_LABELS[st]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3 text-center">
                    <input
                      type="checkbox"
                      className={toggleCls}
                      checked={exc.closed}
                      onChange={(e) => {
                        const next = [...exceptions];
                        next[i] = { ...exc, closed: e.target.checked };
                        setExceptions(next);
                      }}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      className={inputCls}
                      value={exc.note ?? ""}
                      placeholder="z.B. Feiertag"
                      onChange={(e) => {
                        const next = [...exceptions];
                        next[i] = { ...exc, note: e.target.value || undefined };
                        setExceptions(next);
                      }}
                    />
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/20 hover:text-red-400"
                      onClick={() => setExceptions(exceptions.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {exceptions.length === 0 && (
          <p className="mt-3 text-center text-sm text-slate-500">Keine Ausnahmen definiert.</p>
        )}
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-blue-500 hover:text-blue-400"
          onClick={() =>
            setExceptions([
              ...exceptions,
              { id: uid(), date: "", closed: true, note: "" },
            ])
          }
        >
          <Plus className="h-3.5 w-3.5" /> Ausnahme hinzufügen
        </button>
      </SectionCard>

      {status && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm text-slate-200">
          {status}
        </div>
      )}
    </div>
  );
}

function SectionCard({
  title,
  saving,
  onSave,
  children,
}: {
  title: string;
  saving: boolean;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">{title}</h2>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Speichern
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

import { formatInTimeZone } from "date-fns-tz";

import { prisma } from "@/server/db/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createAvailabilityExceptionAction,
  createAvailabilityRuleAction,
  deleteAvailabilityExceptionAction,
  updateAvailabilityRuleAction,
} from "@/app/admin/availability/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const dow = [
  { v: 1, l: "Mo" },
  { v: 2, l: "Di" },
  { v: 3, l: "Mi" },
  { v: 4, l: "Do" },
  { v: 5, l: "Fr" },
  { v: 6, l: "Sa" },
  { v: 7, l: "So" },
];

export default async function AdminAvailabilityPage() {
  let dbWarning: string | null = null;
  let rules: Awaited<ReturnType<typeof prisma.availabilityRule.findMany>> = [];
  let exceptions: Awaited<ReturnType<typeof prisma.availabilityException.findMany>> = [];

  try {
    [rules, exceptions] = await Promise.all([
      prisma.availabilityRule.findMany({ orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] }),
      prisma.availabilityException.findMany({ orderBy: { date: "asc" } }),
    ]);
  } catch (error) {
    console.error("[admin/availability] failed to load data", error);
    dbWarning = "Verfügbarkeitsdaten konnten gerade nicht geladen werden. Bitte Datenbankverbindung prüfen.";
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
        <div className="text-xl font-extrabold text-white">Zeitfenster</div>
        <div className="mt-2 text-sm font-semibold text-slate-200">
          Definiert verfügbare Zeitfenster (Kapazität pro Zeitfenster). Änderungen wirken sofort.
        </div>
      </div>

      {dbWarning ? (
        <div className="rounded-xl border border-amber-300 bg-amber-100/95 px-4 py-3 text-sm font-semibold text-amber-900">
          {dbWarning}
        </div>
      ) : null}

      <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
        <div className="text-sm font-extrabold text-white">Neue Regel</div>
        <form action={createAvailabilityRuleAction} className="mt-4 grid gap-3 md:grid-cols-6">
          <div>
            <div className="text-xs font-bold text-slate-200">Tag</div>
            <Select name="dayOfWeek" defaultValue="1" className="border-2 border-slate-600 bg-slate-700 text-white">
              {dow.map((d) => (
                <option key={d.v} value={String(d.v)}>{d.l}</option>
              ))}
            </Select>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">Start</div>
            <Input name="startTime" defaultValue="08:00" placeholder="08:00" className="border-2 border-slate-600 bg-slate-700 text-white placeholder:text-slate-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">Ende</div>
            <Input name="endTime" defaultValue="18:00" placeholder="18:00" className="border-2 border-slate-600 bg-slate-700 text-white placeholder:text-slate-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">Zeitfenster (Min)</div>
            <Input name="slotMinutes" type="number" defaultValue="60" className="border-2 border-slate-600 bg-slate-700 text-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">Kapazität</div>
            <Input name="capacity" type="number" defaultValue="2" className="border-2 border-slate-600 bg-slate-700 text-white" />
          </div>
          <div className="flex items-end justify-end">
            <Button type="submit">Erstellen</Button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-3xl border-2 border-slate-600 bg-slate-800 shadow-lg">
        <div className="px-6 py-4 text-sm font-extrabold text-white">Regeln</div>
        <div className="overflow-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="border-b-2 border-slate-600 bg-slate-700 text-xs font-extrabold text-slate-100">
              <tr>
                <th className="px-4 py-3">Aktiv</th>
                <th className="px-4 py-3">Tag</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">Ende</th>
                <th className="px-4 py-3">Zeitfenster</th>
                <th className="px-4 py-3">Kapazität</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-t border-slate-600 hover:bg-slate-700/50">
                  <td className="px-4 py-3" colSpan={7}>
                    <form action={updateAvailabilityRuleAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <Checkbox name="active" defaultChecked={r.active} className="border-slate-500" />
                      <Select name="dayOfWeek" defaultValue={String(r.dayOfWeek)} className="h-10 w-[90px] border-2 border-slate-600 bg-slate-700 text-white">
                        {dow.map((d) => (
                          <option key={d.v} value={String(d.v)}>{d.l}</option>
                        ))}
                      </Select>
                      <Input name="startTime" defaultValue={r.startTime} className="h-10 w-[110px] border-2 border-slate-600 bg-slate-700 text-white" />
                      <Input name="endTime" defaultValue={r.endTime} className="h-10 w-[110px] border-2 border-slate-600 bg-slate-700 text-white" />
                      <Input name="slotMinutes" type="number" defaultValue={String(r.slotMinutes)} className="h-10 w-[110px] border-2 border-slate-600 bg-slate-700 text-white" />
                      <Input name="capacity" type="number" defaultValue={String(r.capacity)} className="h-10 w-[110px] border-2 border-slate-600 bg-slate-700 text-white" />
                      <Button type="submit" size="sm">Speichern</Button>
                    </form>
                  </td>
                </tr>
              ))}
              {rules.length === 0 ? (
                <tr><td className="px-4 py-10 text-center text-sm font-semibold text-slate-300">Keine Regeln.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
        <div className="text-sm font-extrabold text-white">Ausnahmen (z.B. Feiertage)</div>
        <form action={createAvailabilityExceptionAction} className="mt-4 grid gap-3 md:grid-cols-6">
          <div>
            <div className="text-xs font-bold text-slate-200">Datum</div>
            <Input name="date" type="date" required className="border-2 border-slate-600 bg-slate-700 text-white" />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Checkbox name="closed" className="border-slate-500" /> Geschlossen
            </label>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">Kapazität (optional)</div>
            <Input name="overrideCapacity" type="number" placeholder="z.B. 1" className="border-2 border-slate-600 bg-slate-700 text-white placeholder:text-slate-400" />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs font-bold text-slate-200">Notiz</div>
            <Input name="note" placeholder="Feiertag / Sonderplanung" className="border-2 border-slate-600 bg-slate-700 text-white placeholder:text-slate-400" />
          </div>
          <div className="flex items-end justify-end"><Button type="submit">Hinzufügen</Button></div>
        </form>

        <div className="mt-6 grid gap-2">
          {exceptions.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-slate-600 bg-slate-700/50 p-4">
              <div className="text-sm font-semibold text-slate-200">
                {formatInTimeZone(e.date, "Europe/Berlin", "dd.MM.yyyy")}
                {" · "}
                {e.closed ? "Geschlossen" : "Offen"}
                {e.overrideCapacity != null ? ` · Kapazität: ${e.overrideCapacity}` : ""}
                {e.note ? ` · ${e.note}` : ""}
              </div>
              <form action={deleteAvailabilityExceptionAction}>
                <input type="hidden" name="id" value={e.id} />
                <Button type="submit" size="sm" variant="outline-light">Löschen</Button>
              </form>
            </div>
          ))}
          {exceptions.length === 0 ? (
            <div className="rounded-2xl border-2 border-slate-600 bg-slate-700/50 p-4 text-sm font-semibold text-slate-200">
              Keine Ausnahmen.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

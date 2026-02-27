"use client";

import { Building2, Info, PackagePlus, ParkingCircle, Rocket, Trash2 } from "lucide-react";

import type { ExtrasState } from "@/app/booking-v2/components/types";

const extraCatalog = [
  {
    key: "packing" as const,
    title: "Packservice",
    hint: "Sicheres Ein- und Auspacken durch das Team.",
    impact: "+25,00 €",
    icon: PackagePlus,
  },
  {
    key: "stairs" as const,
    title: "Treppen ohne Aufzug",
    hint: "Zusätzlicher Aufwand für Tragewege und Etagen.",
    impact: "Aufwand höher",
    icon: Building2,
  },
  {
    key: "express" as const,
    title: "Express-Priorität",
    hint: "Schnellere Terminvergabe und priorisierte Planung.",
    impact: "Schneller Termin",
    icon: Rocket,
  },
  {
    key: "noParkingZone" as const,
    title: "Halteverbotszone",
    hint: "Organisation und Einplanung direkt im Auftrag.",
    impact: "Parkaufwand berücksichtigt",
    icon: ParkingCircle,
  },
  {
    key: "disposalBags" as const,
    title: "Zusätzliche Entsorgung",
    hint: "Zusatzaufwand für gemischte Entsorgungsmaterialien.",
    impact: "+40,00 €",
    icon: Trash2,
  },
];

export function ExtrasSection(props: {
  value: ExtrasState;
  promoCode?: string;
  onChange: (next: ExtrasState) => void;
  onPromoCodeChange: (next: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">4. Zusatzoptionen</h2>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Aktivieren Sie nur relevante Optionen. Die Schätzung wird live angepasst.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {extraCatalog.map((item) => {
          const Icon = item.icon;
          const active = props.value[item.key];
          return (
            <label
              key={item.key}
              className={`group flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                active
                  ? "border-cyan-400/70 bg-cyan-500/12 shadow-[0_0_0_1px_rgba(56,189,248,0.32)]"
                  : "border-slate-300/70 bg-white/60 hover:border-cyan-300 dark:border-slate-700 dark:bg-slate-900/50"
              }`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => props.onChange({ ...props.value, [item.key]: e.target.checked })}
                className="mt-1 h-4 w-4 accent-cyan-500"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                  <div className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{item.title}</div>
                  <span className="ml-auto text-xs font-bold text-cyan-700 dark:text-cyan-200">{item.impact}</span>
                </div>
                <div className="mt-1 flex items-start gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{item.hint}</span>
                </div>
              </div>
            </label>
          );
        })}
      </div>
      <div className="rounded-2xl border border-slate-300/70 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-900/50">
        <label className="text-sm font-bold text-slate-900 dark:text-white">Rabattcode</label>
        <input
          type="text"
          value={props.promoCode ?? ""}
          onChange={(e) => props.onPromoCodeChange(e.target.value.toUpperCase())}
          placeholder="z. B. SOMMER10"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          Der Code wird sofort in der Live-Kalkulation geprüft und berücksichtigt.
        </p>
      </div>
    </section>
  );
}



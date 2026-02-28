"use client";

import { useMemo, useState } from "react";
import { Home, Building2, Castle, Warehouse } from "lucide-react";
import { formatNumberDE } from "@/lib/format-number";

export const roomToVolume = {
  "1-zimmer": { label: "1 Zimmer", volume: 15, icon: Home },
  "2-zimmer": { label: "2 Zimmer", volume: 28, icon: Building2 },
  "3-zimmer": { label: "3 Zimmer", volume: 42, icon: Castle },
  haus: { label: "Haus", volume: 65, icon: Warehouse },
} as const;

export type RoomKind = keyof typeof roomToVolume;

interface RoomCalculatorProps {
  onVolumeChange?: (volume: number) => void;
}

export function RoomCalculator({ onVolumeChange }: RoomCalculatorProps) {
  const [kind, setKind] = useState<RoomKind>("2-zimmer");
  const m3 = useMemo(() => roomToVolume[kind].volume, [kind]);

  return (
    <div className="rounded-3xl border-2 border-sky-200 bg-white/88 p-5 shadow-md backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className="text-sm font-extrabold text-slate-900 dark:text-white">
        Zimmer zu m³ Schnellrechner
      </div>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        Wählen Sie Ihre Wohnungsgröße für eine schnelle Volumen-Schätzung.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.entries(roomToVolume) as [RoomKind, (typeof roomToVolume)[RoomKind]][]).map(
          ([key, { label, volume, icon: Icon }]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setKind(key);
                onVolumeChange?.(volume);
              }}
              className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-3 text-sm font-bold transition-all ${
                key === kind
                  ? "border-brand-500 bg-brand-50 text-brand-800 shadow-md dark:bg-brand-950/30 dark:text-brand-300 dark:border-brand-400"
                  : "border-slate-300 bg-white/90 text-slate-800 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800"
              }`}
              aria-pressed={key === kind}
            >
              <Icon className={`h-5 w-5 ${key === kind ? "text-brand-600 dark:text-brand-400" : "text-slate-500"}`} />
              <span>{label}</span>
              <span className={`text-xs ${key === kind ? "text-brand-600 dark:text-brand-400" : "text-slate-600 dark:text-slate-400"}`}>
                ~{formatNumberDE(volume)} m³
              </span>
            </button>
          ),
        )}
      </div>
      <div className="mt-4 rounded-xl border-2 border-sky-200 bg-sky-50/90 px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200">
        Geschätztes Volumen:{" "}
        <span className="font-extrabold text-slate-950 dark:text-white">{formatNumberDE(m3)} m³</span>
        <span className="ml-2 text-xs text-slate-600 dark:text-slate-400">(Durchschnittswert)</span>
      </div>
    </div>
  );
}


"use client";

import { motion } from "framer-motion";

const presets = [
  { key: "studio" as const, label: "Studio", value: 12 },
  { key: "2zimmer" as const, label: "2 Zimmer", value: 24 },
  { key: "3zimmer" as const, label: "3 Zimmer", value: 38 },
  { key: "haus" as const, label: "Haus", value: 58 },
];

export function VolumeEstimatorSection(props: {
  value: number;
  preset: "studio" | "2zimmer" | "3zimmer" | "haus";
  onValueChange: (next: number) => void;
  onPresetChange: (next: "studio" | "2zimmer" | "3zimmer" | "haus") => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">3. Volumenschätzung</h2>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Wählen Sie eine Wohnungsgröße oder passen Sie das Volumen manuell an.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        {presets.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => {
              props.onPresetChange(preset.key);
              props.onValueChange(preset.value);
            }}
            className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
              props.preset === preset.key
                ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-700 dark:text-cyan-200"
                : "border-slate-300/70 bg-white/60 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-300/70 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-900/50">
        <input
          type="range"
          min={4}
          max={120}
          step={1}
          value={props.value}
          onChange={(e) => props.onValueChange(Number(e.target.value))}
          className="w-full accent-cyan-500"
          aria-label="Volumen in Kubikmetern"
        />
        <motion.div
          key={props.value}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-3xl font-black text-slate-900 dark:text-white"
        >
          {props.value} m³
        </motion.div>
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Das Volumen beeinflusst Preis, Teamgröße und die geschätzte Einsatzdauer.
        </div>
      </div>
    </section>
  );
}

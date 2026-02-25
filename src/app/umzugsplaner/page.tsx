"use client";

import { useMemo, useState } from "react";

import { Container } from "@/components/container";

const checklist = [
  { phase: "4 Wochen vorher", task: "Umzugstermin festlegen und Angebot einholen." },
  { phase: "2 Wochen vorher", task: "Kartons organisieren und nach Räumen sortieren." },
  { phase: "1 Woche vorher", task: "Adressänderungen und Verträge aktualisieren." },
  { phase: "Umzugstag", task: "Wichtige Dokumente separat bereit halten." },
];

export default function UmzugsplanerPage() {
  const [done, setDone] = useState<Record<number, boolean>>({});
  const progress = useMemo(
    () => Math.round((Object.values(done).filter(Boolean).length / checklist.length) * 100),
    [done],
  );

  return (
    <Container className="py-14">
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-950">Umzugsplaner</h1>
      <p className="mt-3 text-sm text-slate-800">
        Interaktive Checkliste für einen stressfreien Umzug.
      </p>

      <div className="glass-card-solid mt-8 rounded-3xl border-2 border-slate-300 p-5 shadow-md">
        <div className="text-sm font-bold text-slate-800">Fortschritt: {progress}%</div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-brand-600" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {checklist.map((row, idx) => (
          <label key={row.task} className="glass-card-solid flex items-start gap-3 rounded-2xl border-2 border-slate-300 p-4 shadow-sm transition-colors hover:border-slate-400">
            <input
              type="checkbox"
              checked={!!done[idx]}
              onChange={(e) => setDone((prev) => ({ ...prev, [idx]: e.target.checked }))}
              className="mt-0.5 h-4 w-4 accent-brand-600"
            />
            <div>
              <div className="text-xs font-bold text-slate-700">{row.phase}</div>
              <div className="text-sm font-semibold text-slate-900">{row.task}</div>
            </div>
          </label>
        ))}
      </div>
    </Container>
  );
}


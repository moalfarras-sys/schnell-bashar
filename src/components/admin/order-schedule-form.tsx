"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OrderScheduleForm(props: { publicId: string }) {
  const router = useRouter();
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function submitSchedule() {
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(props.publicId)}/schedule`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slotStart: new Date(slotStart).toISOString(),
          slotEnd: new Date(slotEnd).toISOString(),
          note: note.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Termin konnte nicht bestätigt werden.");
      }
      setOk("Termin bestätigt und E-Mail gesendet.");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Termin konnte nicht bestätigt werden.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-slate-600 bg-slate-900/40 p-4">
      <div className="text-xs font-extrabold uppercase tracking-wide text-slate-300">
        Termin bestätigen
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-300">Start</label>
          <Input
            type="datetime-local"
            value={slotStart}
            onChange={(e) => setSlotStart(e.target.value)}
            className="h-10 border-slate-600 bg-slate-800 text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-300">Ende</label>
          <Input
            type="datetime-local"
            value={slotEnd}
            onChange={(e) => setSlotEnd(e.target.value)}
            className="h-10 border-slate-600 bg-slate-800 text-white"
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-xs font-bold text-slate-300">Hinweis (optional)</label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-10 border-slate-600 bg-slate-800 text-white"
          placeholder="z. B. bitte 15 Minuten vorher anrufen"
        />
      </div>
      {error ? <div className="mt-3 text-xs font-semibold text-red-300">{error}</div> : null}
      {ok ? <div className="mt-3 text-xs font-semibold text-emerald-300">{ok}</div> : null}
      <div className="mt-4">
        <Button
          size="sm"
          type="button"
          onClick={submitSchedule}
          disabled={!slotStart || !slotEnd || loading}
        >
          {loading ? "Speichern..." : "Termin bestätigen"}
        </Button>
      </div>
    </div>
  );
}


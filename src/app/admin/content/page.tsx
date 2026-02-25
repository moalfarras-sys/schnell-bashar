"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Loader2, RotateCcw, Type } from "lucide-react";

type TextSlot = {
  key: string;
  label: string;
  value: string;
  fallback: string;
  multiline?: boolean;
};

const TEXT_SLOTS: TextSlot[] = [
  {
    key: "text.home.hero.headline",
    label: "Hero Überschrift",
    fallback: "Stressfrei umziehen mit erfahrenen Profis.",
    value: "",
  },
  {
    key: "text.home.hero.subtitle",
    label: "Hero Untertitel",
    fallback:
      "Umzug, Entsorgung und Montage — strukturiert, zuverlässig und deutschlandweit. Ihr Premium-Umzugsservice mit modernem Buchungssystem.",
    value: "",
    multiline: true,
  },
  {
    key: "text.home.cta.headline",
    label: "CTA Überschrift",
    fallback: "Bereit für Ihr Angebot?",
    value: "",
  },
  {
    key: "text.home.cta.subtitle",
    label: "CTA Untertitel",
    fallback:
      "Ein Anruf genügt — oder nutzen Sie unser Online-Buchungsformular für Umzug und Entsorgung.",
    value: "",
    multiline: true,
  },
  {
    key: "text.home.testimonial.1.name",
    label: "Bewertung 1 — Name",
    fallback: "Familie K.",
    value: "",
  },
  {
    key: "text.home.testimonial.1.text",
    label: "Bewertung 1 — Text",
    fallback:
      "Sehr freundlich, pünktlich und gut organisiert. Der Umzug lief stressfrei und sauber.",
    value: "",
    multiline: true,
  },
  {
    key: "text.home.testimonial.2.name",
    label: "Bewertung 2 — Name",
    fallback: "Büroservice M.",
    value: "",
  },
  {
    key: "text.home.testimonial.2.text",
    label: "Bewertung 2 — Text",
    fallback:
      "Klare Kommunikation und faire Preise. Besonders stark bei kurzfristiger Planung.",
    value: "",
    multiline: true,
  },
  {
    key: "text.home.testimonial.3.name",
    label: "Bewertung 3 — Name",
    fallback: "Haushalt M.",
    value: "",
  },
  {
    key: "text.home.testimonial.3.text",
    label: "Bewertung 3 — Text",
    fallback:
      "Sperrmüll wurde schnell abgeholt, alles transparent erklärt und professionell umgesetzt.",
    value: "",
    multiline: true,
  },
];

export default function AdminContentPage() {
  const [slots, setSlots] = useState<TextSlot[]>(TEXT_SLOTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/content");
      if (res.ok) {
        const data = await res.json();
        const remote: Record<string, string> = data.slots ?? {};
        setSlots((prev) =>
          prev.map((s) => ({
            ...s,
            value: remote[s.key] ?? "",
          })),
        );
      }
    } catch {
      /* keep defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  function update(key: string, value: string) {
    setSaved(false);
    setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const payload: Record<string, string> = {};
      for (const s of slots) {
        payload[s.key] = s.value;
      }
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: payload }),
      });
      if (res.ok) setSaved(true);
    } catch {
      /* toast would go here */
    } finally {
      setSaving(false);
    }
  }

  function resetSlot(key: string) {
    const def = TEXT_SLOTS.find((s) => s.key === key);
    if (def) update(key, "");
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border-2 border-slate-600 bg-slate-800 p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <Type className="h-5 w-5 text-brand-400" />
          <div>
            <div className="text-xl font-extrabold text-white">Inhalte bearbeiten</div>
            <div className="mt-1 text-sm text-slate-300">
              Texte der Startseite anpassen. Leere Felder verwenden den Standardtext.
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {slots.map((s) => (
              <div
                key={s.key}
                className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4"
              >
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-200">{s.label}</label>
                  <button
                    type="button"
                    onClick={() => resetSlot(s.key)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
                    title="Auf Standardtext zurücksetzen"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Standard
                  </button>
                </div>
                {s.multiline ? (
                  <textarea
                    value={s.value}
                    onChange={(e) => update(s.key, e.target.value)}
                    placeholder={s.fallback}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={s.value}
                    onChange={(e) => update(s.key, e.target.value)}
                    placeholder={s.fallback}
                    className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none"
                  />
                )}
                <div className="mt-1 text-xs text-slate-500">
                  Schlüssel: <code className="text-slate-400">{s.key}</code>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-brand-500 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Wird gespeichert..." : "Alle speichern"}
            </button>
            {saved && (
              <span className="text-sm font-semibold text-emerald-400">
                Gespeichert!
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}


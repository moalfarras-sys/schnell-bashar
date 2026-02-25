"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

type SettingsModel = {
  internalOrderEmailEnabled: boolean;
  customerConfirmationEmailEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappPhoneE164: string;
  whatsappTemplate: string;
  supportPhone: string;
  supportEmail: string;
  movingFromPriceEur: number;
  disposalFromPriceEur: number;
  montageFromPriceEur: number;
};

export function SettingsClient(props: { initialSettings: SettingsModel }) {
  const [form, setForm] = useState<SettingsModel>(props.initialSettings);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function patch<K extends keyof SettingsModel>(key: K, value: SettingsModel[K]) {
    setStatus(null);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSave() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        throw new Error("Einstellungen konnten nicht gespeichert werden.");
      }
      const data = (await res.json()) as { settings: SettingsModel };
      setForm(data.settings);
      setStatus("Gespeichert");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <h1 className="text-xl font-bold text-white">Benachrichtigungs-Einstellungen</h1>
        <p className="mt-1 text-sm text-slate-300">
          Steuerung für Anfrage-E-Mails und WhatsApp-Ausgabe im Buchungsflow.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/70 p-3 text-sm text-slate-100">
            <input
              type="checkbox"
              checked={form.internalOrderEmailEnabled}
              onChange={(e) => patch("internalOrderEmailEnabled", e.target.checked)}
            />
            Interne Anfrage-E-Mail senden
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/70 p-3 text-sm text-slate-100">
            <input
              type="checkbox"
              checked={form.customerConfirmationEmailEnabled}
              onChange={(e) =>
                patch("customerConfirmationEmailEnabled", e.target.checked)
              }
            />
            Kunden-Bestätigungs-E-Mail senden
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/70 p-3 text-sm text-slate-100 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.whatsappEnabled}
              onChange={(e) => patch("whatsappEnabled", e.target.checked)}
            />
            WhatsApp-Link nach Absenden anzeigen
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Umzug ab (EUR)
            </label>
            <input
              type="number"
              min={0}
              value={form.movingFromPriceEur}
              onChange={(e) => patch("movingFromPriceEur", Number(e.target.value || 0))}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Entsorgung ab (EUR)
            </label>
            <input
              type="number"
              min={0}
              value={form.disposalFromPriceEur}
              onChange={(e) =>
                patch("disposalFromPriceEur", Number(e.target.value || 0))
              }
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Montage ab (EUR)
            </label>
            <input
              type="number"
              min={0}
              value={form.montageFromPriceEur}
              onChange={(e) => patch("montageFromPriceEur", Number(e.target.value || 0))}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              WhatsApp Nummer (E.164 ohne +)
            </label>
            <input
              value={form.whatsappPhoneE164}
              onChange={(e) => patch("whatsappPhoneE164", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
              placeholder="491729573681"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Support Telefon (Anzeige)
            </label>
            <input
              value={form.supportPhone}
              onChange={(e) => patch("supportPhone", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
              placeholder="+49 172 9573681"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Support E-Mail (Anzeige)
            </label>
            <input
              value={form.supportEmail}
              onChange={(e) => patch("supportEmail", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
              placeholder="kontakt@schnellsicherumzug.de"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              WhatsApp Textvorlage
            </label>
            <textarea
              value={form.whatsappTemplate}
              onChange={(e) => patch("whatsappTemplate", e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
              placeholder="Verwende Platzhalter: {publicId}, {context}"
            />
            <p className="mt-1 text-xs text-slate-400">
              Platzhalter: <code>{"{publicId}"}</code>, <code>{"{context}"}</code>
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Speichern
          </button>
          {status ? <span className="text-sm text-slate-300">{status}</span> : null}
        </div>
      </section>
    </div>
  );
}

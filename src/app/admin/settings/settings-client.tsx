"use client";

import { useState } from "react";
import { Loader2, Save, Send } from "lucide-react";

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
  whatsappMetaEnabled: boolean;
  whatsappMetaPhoneNumberId: string;
  whatsappMetaAccessToken: string;
  whatsappMetaVerifyToken: string;
  whatsappMetaDefaultTemplate: string;
  signingMode: "INTERNAL_ONLY" | "HYBRID";
};

export function SettingsClient(props: { initialSettings: SettingsModel }) {
  const [form, setForm] = useState<SettingsModel>(props.initialSettings);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testPhone, setTestPhone] = useState("");
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

  async function sendTemplateTest() {
    if (!testPhone.trim()) {
      setStatus("Bitte Testnummer eingeben.");
      return;
    }
    setSendingTest(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/whatsapp/templates/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testPhone.trim(),
          templateName: form.whatsappMetaDefaultTemplate,
          lang: "de",
          variables: ["Schnell Sicher Umzug", "Testnachricht"],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Testversand fehlgeschlagen.");
      }
      setStatus("WhatsApp-Testvorlage wurde gesendet.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Testversand fehlgeschlagen.");
    } finally {
      setSendingTest(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <h1 className="text-xl font-bold text-white">Einstellungen & Integrationen</h1>
        <p className="mt-1 text-sm text-slate-300">
          Steuerung für Benachrichtigungen, öffentliche Preise und WhatsApp Meta.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">Benachrichtigungen</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
              onChange={(e) => patch("customerConfirmationEmailEnabled", e.target.checked)}
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
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Signatur-Modus</label>
            <div className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              Interne Signatur (aktiv)
            </div>
            <input type="hidden" value="INTERNAL_ONLY" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">Öffentliche Richtpreise</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <FieldNumber label="Umzug ab (EUR)" value={form.movingFromPriceEur} onChange={(v) => patch("movingFromPriceEur", v)} />
          <FieldNumber label="Entsorgung ab (EUR)" value={form.disposalFromPriceEur} onChange={(v) => patch("disposalFromPriceEur", v)} />
          <FieldNumber label="Montage ab (EUR)" value={form.montageFromPriceEur} onChange={(v) => patch("montageFromPriceEur", v)} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">Support-Kontakt</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <FieldText label="Support Telefon" value={form.supportPhone} onChange={(v) => patch("supportPhone", v)} placeholder="+49 172 9573681" />
          <FieldText label="Support E-Mail" value={form.supportEmail} onChange={(v) => patch("supportEmail", v)} placeholder="kontakt@schnellsicherumzug.de" />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">WhatsApp Textvorlage</label>
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
      </section>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">WhatsApp Meta Cloud API</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/70 p-3 text-sm text-slate-100 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.whatsappMetaEnabled}
              onChange={(e) => patch("whatsappMetaEnabled", e.target.checked)}
            />
            Meta WhatsApp aktivieren
          </label>
          <FieldText
            label="Phone Number ID"
            value={form.whatsappMetaPhoneNumberId}
            onChange={(v) => patch("whatsappMetaPhoneNumberId", v)}
            placeholder="123456789012345"
          />
          <FieldText
            label="Webhook Verify Token"
            value={form.whatsappMetaVerifyToken}
            onChange={(v) => patch("whatsappMetaVerifyToken", v)}
            placeholder="starkes_token"
          />
          <FieldText
            label="Access Token"
            value={form.whatsappMetaAccessToken}
            onChange={(v) => patch("whatsappMetaAccessToken", v)}
            placeholder="EAA..."
          />
          <FieldText
            label="Default Template"
            value={form.whatsappMetaDefaultTemplate}
            onChange={(v) => patch("whatsappMetaDefaultTemplate", v)}
            placeholder="schnell_sicher_status_update"
          />
          <div className="sm:col-span-2 rounded-xl border border-slate-700 bg-slate-800/60 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Template-Test</div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                placeholder="Empfänger (E.164 ohne +)"
              />
              <button
                type="button"
                onClick={sendTemplateTest}
                disabled={sendingTest}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Test senden
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
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
    </div>
  );
}

function FieldText(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">{props.label}</label>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
        placeholder={props.placeholder}
      />
    </div>
  );
}

function FieldNumber(props: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">{props.label}</label>
      <input
        type="number"
        min={0}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value || 0))}
        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
      />
    </div>
  );
}

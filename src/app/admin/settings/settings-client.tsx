"use client";

import { useEffect, useState } from "react";
import { Loader2, MailCheck, Save, Send, ShieldCheck, TriangleAlert } from "lucide-react";

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

type HealthModel = {
  ok: boolean;
  env?: {
    databaseUrl?: { configured: boolean; kind: string; host?: string; port?: string };
    directUrl?: { configured: boolean; kind: string; host?: string; port?: string };
    supabaseUrl?: boolean;
    supabaseAnonKey?: boolean;
    supabaseServiceRoleKey?: boolean;
  };
  checks?: {
    db?: { ok: boolean; ms: number; message?: string };
    storage?: { ok: boolean; ms: number; message?: string; result?: Array<{ name: string; exists: boolean }> };
    smtp?: { ok: boolean; code?: string; message?: string };
  };
  integrations?: {
    smtp?: {
      ready: boolean;
      configured: boolean;
      deep?: {
        ok: boolean;
        code: string;
        message: string;
      };
    };
    ors?: {
      ready: boolean;
    };
  };
};

export function SettingsClient(props: { initialSettings: SettingsModel }) {
  const [form, setForm] = useState<SettingsModel>(props.initialSettings);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingEmailTest, setSendingEmailTest] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testEmail, setTestEmail] = useState(props.initialSettings.supportEmail || "");
  const [status, setStatus] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthModel | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadHealth() {
      setHealthLoading(true);
      try {
        const res = await fetch("/api/admin/system/diagnostics", { cache: "no-store" });
        const data = (await res.json()) as HealthModel;
        if (!cancelled) setHealth(data);
      } catch {
        if (!cancelled) setHealth(null);
      } finally {
        if (!cancelled) setHealthLoading(false);
      }
    }
    loadHealth();
    return () => {
      cancelled = true;
    };
  }, []);

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

  async function sendEmailTest() {
    setSendingEmailTest(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Test-E-Mail konnte nicht gesendet werden.");
      }
      setStatus(data.message || "Test-E-Mail wurde gesendet.");
      setHealth((prev) =>
        prev
          ? {
              ...prev,
              integrations: {
                ...prev.integrations,
                smtp: {
                  ready: true,
                  configured: true,
                  deep: { ok: true, code: "OK", message: "SMTP test sent." },
                },
              },
            }
          : prev,
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Test-E-Mail fehlgeschlagen.");
    } finally {
      setSendingEmailTest(false);
    }
  }

  const smtpCheck = health?.checks?.smtp;
  const smtpLegacy = health?.integrations?.smtp;
  const smtpReady = Boolean(smtpCheck?.ok || smtpLegacy?.ready);
  const dbReady = Boolean(health?.checks?.db?.ok);
  const storageReady = Boolean(health?.checks?.storage?.ok);

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <h1 className="text-xl font-bold text-white">Einstellungen & Integrationen</h1>
        <p className="mt-1 text-sm text-slate-300">
          Steuerung für Benachrichtigungen, öffentliche Preise und WhatsApp Meta.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">
              Systemstatus
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Prüfen Sie hier, ob E-Mail und wichtige Integrationen bereit sind.
            </p>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold ${
              dbReady && smtpReady && storageReady
                ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30"
                : "bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/30"
            }`}
          >
            {dbReady && smtpReady && storageReady ? <ShieldCheck className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
            {healthLoading ? "Prüfung läuft" : dbReady && smtpReady && storageReady ? "System bereit" : "System prüfen"}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
            <div className="text-sm font-bold text-white">Datenbank</div>
            <div className="mt-2 text-xs font-semibold text-slate-300">
              {healthLoading
                ? "Datenbank wird geprüft..."
                : dbReady
                  ? `Verbunden (${health?.checks?.db?.ms ?? 0} ms).`
                  : health?.checks?.db?.message || "Datenbank ist nicht bereit."}
            </div>
            <div className="mt-2 text-[11px] font-semibold text-slate-400">
              Verbindung: {health?.env?.databaseUrl?.kind ?? "unbekannt"}
              {health?.env?.databaseUrl?.host ? ` (${health.env.databaseUrl.host}:${health.env.databaseUrl.port})` : ""}
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <MailCheck className="h-4 w-4 text-brand-300" />
              E-Mail Versand
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-300">
              {healthLoading
                ? "SMTP wird geprüft..."
                : smtpReady
                  ? "E-Mails können gesendet werden."
                  : smtpCheck?.message || smtpLegacy?.deep?.message || "SMTP ist nicht bereit oder nicht vollständig konfiguriert."}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
                placeholder="kontakt@schnellsicherumzug.de"
              />
              <button
                type="button"
                onClick={sendEmailTest}
                disabled={sendingEmailTest}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {sendingEmailTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Test senden
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
            <div className="text-sm font-bold text-white">Supabase Storage</div>
            <div className="mt-2 text-xs font-semibold text-slate-300">
              {healthLoading
                ? "Wird geprüft..."
                : storageReady
                  ? "Buckets sind erreichbar."
                  : health?.checks?.storage?.message || "Supabase Storage ist nicht vollständig konfiguriert."}
            </div>
            <div className="mt-2 text-[11px] font-semibold text-slate-400">
              URL: {health?.env?.supabaseUrl ? "vorhanden" : "fehlt"} · Service Role: {health?.env?.supabaseServiceRoleKey ? "vorhanden" : "fehlt"}
            </div>
          </div>
        </div>
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

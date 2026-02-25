"use client";

import { useState } from "react";
import { Loader2, Send, CheckCircle2, ExternalLink } from "lucide-react";

type Props = {
  orderId: string;
  existingOffer: {
    id: string;
    offerNo: string | null;
    status: string;
    contract: { id: string; status: string } | null;
  } | null;
};

export function CreateOfferButton({ orderId, existingOffer }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    offerNo?: string;
    offerLink?: string;
    emailSent?: boolean;
    error?: string;
  } | null>(null);

  if (existingOffer) {
    const contractBadge =
      existingOffer.contract?.status === "SIGNED"
        ? "Vertrag unterschrieben"
        : existingOffer.contract
          ? "Vertrag erstellt"
          : null;

    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Angebot erstellt — {existingOffer.offerNo ?? existingOffer.id}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <span className="rounded-full bg-slate-700 px-2 py-0.5 font-semibold">
            {existingOffer.status}
          </span>
          {contractBadge && (
            <span className="rounded-full bg-blue-900/50 px-2 py-0.5 font-semibold text-blue-300">
              {contractBadge}
            </span>
          )}
          <a
            href="/admin/offers"
            className="inline-flex items-center gap-1 font-semibold text-brand-400 hover:underline"
          >
            Angebote öffnen <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }

  if (result?.success) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Angebot erstellt — {result.offerNo}
        </div>
        <div className="mt-1 text-xs text-slate-300">
          {result.emailSent !== false
            ? "E-Mail mit Angebot wurde an den Kunden gesendet."
            : "Angebot erstellt, E-Mail konnte nicht gesendet werden (SMTP prüfen)."}
        </div>
        {result.offerLink && (
          <a
            href={result.offerLink}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:underline"
          >
            Angebotslink öffnen <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    );
  }

  async function handleCreate() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/offers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, error: data.error ?? "Unbekannter Fehler" });
      } else {
        setResult({
          success: true,
          offerNo: data.offerNo,
          offerLink: data.offerLink,
          emailSent: data.emailSent,
        });
      }
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : "Netzwerkfehler",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleCreate}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-emerald-500 hover:-translate-y-px disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {loading ? "Wird erstellt..." : "Angebot erstellen & senden"}
      </button>
      {result?.error && (
        <div className="mt-2 rounded-xl border border-red-500/30 bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-400">
          {result.error}
        </div>
      )}
    </div>
  );
}


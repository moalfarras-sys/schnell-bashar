"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AcceptButtonProps {
  offerId: string;
}

export function AcceptButton({ offerId }: AcceptButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [agbAccepted, setAgbAccepted] = useState(false);
  const router = useRouter();

  async function handleAccept() {
    if (!agbAccepted) {
      setError("Bitte akzeptieren Sie die AGB, um fortzufahren.");
      return;
    }

    setLoading(true);
    setError(null);
    setWarning(null);

    try {
      const res = await fetch(`/api/offers/${offerId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Fehler beim Annehmen des Angebots");
      }

      const data = await res.json().catch(() => ({}));
      if (typeof data.warning === "string" && data.warning.trim()) {
        setWarning(data.warning);
      }

      if (data.signingUrl) {
        window.location.href = data.signingUrl;
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={agbAccepted}
            onChange={(e) => {
              setAgbAccepted(e.target.checked);
              if (e.target.checked) setError(null);
            }}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-700"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Ich habe die{" "}
            <a
              href="/api/agb/pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-brand-600 underline hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              <FileText className="h-3.5 w-3.5" />
              AGB
            </a>{" "}
            gelesen und akzeptiere diese.
          </span>
        </label>
      </div>

      <Button
        size="lg"
        className="w-full gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-500"
        onClick={handleAccept}
        disabled={loading || !agbAccepted}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Wird bearbeitet...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5" />
            Jetzt verbindlich beauftragen
          </>
        )}
      </Button>

      {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
      {warning && (
        <p className="text-center text-sm text-amber-600 dark:text-amber-400">{warning}</p>
      )}
    </div>
  );
}

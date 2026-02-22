"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  endpoint: string;
  entityLabel: string;
  buttonLabel?: string;
  compact?: boolean;
  onSuccess?: () => void;
};

type ApiResponse = {
  error?: string;
  warnings?: Array<{ target: string; message: string }>;
};

export function HardDeleteButton({
  endpoint,
  entityLabel,
  buttonLabel = "Löschen (Endgültig)",
  compact = false,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warningText, setWarningText] = useState<string | null>(null);

  const canSubmit = confirmed && !loading;

  async function onConfirmDelete() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setWarningText(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmText: "DELETE" }),
      });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;

      if (!res.ok && res.status !== 409) {
        throw new Error(data.error || "Löschen fehlgeschlagen");
      }

      if (res.status === 409 && data.warnings?.length) {
        setWarningText(`Datensatz gelöscht, aber ${data.warnings.length} Datei(en) konnten nicht entfernt werden.`);
      }

      setOpen(false);
      setConfirmed(false);
      router.refresh();
      onSuccess?.();
      if (res.status === 409 && data.warnings?.length) {
        setTimeout(() => {
          setWarningText(null);
        }, 7000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size={compact ? "sm" : "md"}
        variant="outline"
        className="gap-1 border-red-200 text-red-700 hover:bg-red-50"
        onClick={() => {
          setOpen(true);
          setError(null);
        }}
      >
        <Trash2 className="h-4 w-4" />
        {buttonLabel}
      </Button>

      {warningText ? <div className="text-xs text-amber-700">{warningText}</div> : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border-2 border-slate-300 bg-white p-5 shadow-xl">
            <h3 className="text-lg font-extrabold text-slate-900">Endgültig löschen</h3>
            <p className="mt-2 text-sm text-slate-700">
              {entityLabel} wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border-2 border-red-200 bg-red-50 p-3">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 accent-red-600"
              />
              <span className="text-sm font-semibold text-red-800">
                Ich bestätige, dass ich diesen Datensatz endgültig löschen möchte.
              </span>
            </label>

            {error ? <div className="mt-2 text-sm text-red-700">{error}</div> : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setConfirmed(false);
                  setError(null);
                }}
                disabled={loading}
              >
                Abbrechen
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={onConfirmDelete}
                disabled={!canSubmit}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Endgültig löschen
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}


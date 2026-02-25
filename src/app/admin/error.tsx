"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin/error-boundary]", error);
  }, [error]);

  return (
    <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-red-900">
      <h2 className="text-lg font-extrabold">Admin-Fehler</h2>
      <p className="mt-2 text-sm">
        Die Seite konnte nicht korrekt geladen werden. Bitte erneut versuchen.
      </p>
      {error?.digest ? (
        <p className="mt-2 text-xs opacity-80">Trace-ID: {error.digest}</p>
      ) : null}
      <div className="mt-4">
        <Button type="button" onClick={reset}>
          Erneut laden
        </Button>
      </div>
    </div>
  );
}


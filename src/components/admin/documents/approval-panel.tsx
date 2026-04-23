"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { documentStatusLabel } from "@/lib/admin-labels";

export function ApprovalPanel({
  documentId,
  status,
}: {
  documentId: string;
  status: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<"approve" | "revoke" | null>(null);

  async function approve() {
    setLoading("approve");
    setMessage(null);
    const response = await fetch(`/api/admin/documents/${documentId}/approve-signature`, {
      method: "POST",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error || "Freigabe fehlgeschlagen.");
      setLoading(null);
      return;
    }
    setMessage(`Signatur-Link erstellt: ${data.signingUrl}`);
    setLoading(null);
    router.refresh();
  }

  async function revoke() {
    setLoading("revoke");
    setMessage(null);
    const response = await fetch(`/api/admin/documents/${documentId}/revoke-signature`, {
      method: "POST",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error || "Widerruf fehlgeschlagen.");
      setLoading(null);
      return;
    }
    setMessage("Freigabe widerrufen.");
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/80">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Signaturfreigabe</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Aktueller Status: <span className="font-semibold">{documentStatusLabel(status)}</span>
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" onClick={approve} disabled={loading !== null}>
          {loading === "approve" ? "Wird freigegeben..." : "Zur Unterschrift freigeben"}
        </Button>
        <Button type="button" variant="outline" onClick={revoke} disabled={loading !== null}>
          {loading === "revoke" ? "Wird widerrufen..." : "Freigabe widerrufen"}
        </Button>
      </div>
      {message ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {message}
        </div>
      ) : null}
    </div>
  );
}

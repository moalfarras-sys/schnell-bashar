"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function DocumentFileActions({
  documentId,
  hasSignedPdf,
}: {
  documentId: string;
  hasSignedPdf: boolean;
}) {
  const [loading, setLoading] = useState<"generate" | "download" | "signed" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function openResponsePdf(response: Response) {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function generatePdf() {
    setLoading("generate");
    setMessage(null);
    const response = await fetch(`/api/admin/documents/${documentId}/generate-pdf`, {
      method: "POST",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error || "PDF konnte nicht generiert werden.");
      setLoading(null);
      return;
    }
    await openResponsePdf(response);
    setMessage("PDF wurde neu generiert und geöffnet.");
    setLoading(null);
  }

  async function openPdf(kind: "document" | "signed") {
    setLoading(kind === "signed" ? "signed" : "download");
    setMessage(null);
    const response = await fetch(
      `/api/admin/documents/${documentId}/download${kind === "signed" ? "?kind=signed" : ""}`,
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error || "PDF konnte nicht geöffnet werden.");
      setLoading(null);
      return;
    }
    await openResponsePdf(response);
    setMessage(kind === "signed" ? "Signierte PDF geöffnet." : "Dokument-PDF geöffnet.");
    setLoading(null);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-900">Dateien & PDF</h2>
      <p className="mt-2 text-sm text-slate-600">
        Dokument-PDF öffnen, neu erzeugen oder eine signierte Fassung prüfen.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" onClick={generatePdf} disabled={loading !== null}>
          {loading === "generate" ? "PDF wird erzeugt..." : "PDF generieren"}
        </Button>
        <Button type="button" variant="outline" onClick={() => openPdf("document")} disabled={loading !== null}>
          {loading === "download" ? "Wird geöffnet..." : "PDF öffnen"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => openPdf("signed")}
          disabled={loading !== null || !hasSignedPdf}
        >
          {loading === "signed" ? "Wird geöffnet..." : "Signierte PDF öffnen"}
        </Button>
      </div>
      {message ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {message}
        </div>
      ) : null}
    </div>
  );
}

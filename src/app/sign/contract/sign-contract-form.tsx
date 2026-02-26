"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SignaturePad } from "@/components/signature-canvas";

type SubmitState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "success"; signedAt?: string; pdfUrl?: string | null; offerToken?: string };

export function SignContractForm({
  token,
  customerName,
}: {
  token: string;
  customerName: string;
}) {
  const [signedName, setSignedName] = useState(customerName || "");
  const [agbAccepted, setAgbAccepted] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState<string | undefined>();
  const [state, setState] = useState<SubmitState>({ type: "idle" });

  const handleSignatureChange = useCallback((dataUrl: string | null) => {
    setSignatureDataUrl(dataUrl);
    if (dataUrl) setSignatureError(undefined);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!signatureDataUrl) {
      setSignatureError("Bitte unterschreiben Sie im weißen Feld.");
      return;
    }
    if (!signedName.trim()) {
      setState({ type: "error", message: "Bitte geben Sie Ihren Namen ein." });
      return;
    }
    if (!agbAccepted) {
      setState({ type: "error", message: "Bitte akzeptieren Sie die AGB." });
      return;
    }

    setState({ type: "loading" });

    const res = await fetch("/api/contracts/sign/fallback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        signedName: signedName.trim(),
        agbAccepted,
        signatureDataUrl,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState({ type: "error", message: data.error || "Unterschrift fehlgeschlagen." });
      return;
    }

    setState({
      type: "success",
      signedAt: data.signedAt,
      pdfUrl: data.pdfUrl,
      offerToken: data.offerToken,
    });
  }

  if (state.type === "success") {
    return (
      <div className="max-w-full space-y-4 overflow-hidden rounded-xl border border-green-500/40 bg-green-900/20 p-5 text-green-100">
        <h2 className="text-lg font-bold">Vielen Dank. Vertrag erfolgreich unterschrieben.</h2>
        {state.signedAt ? <p className="text-sm">Zeitpunkt: {new Date(state.signedAt).toLocaleString("de-DE")}</p> : null}
        <div className="flex max-w-full flex-wrap gap-2">
          {state.pdfUrl ? (
            <a href={state.pdfUrl} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="outline">
                Vertrags-PDF öffnen
              </Button>
            </a>
          ) : null}
          {state.offerToken ? (
            <Link href={`/offer/${state.offerToken}`}>
              <Button type="button">Zum Angebot</Button>
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <SignaturePad
        onSignatureChange={handleSignatureChange}
        label="Ihre Unterschrift"
        errorMessage={signatureError}
      />

      <div>
        <label htmlFor="signedName" className="mb-1 block text-sm font-semibold text-slate-200">
          Vollständiger Name für die Unterschrift
        </label>
        <input
          id="signedName"
          name="signedName"
          value={signedName}
          onChange={(e) => setSignedName(e.target.value)}
          autoComplete="name"
          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white"
          placeholder="Max Mustermann"
          required
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-200">
        <input
          type="checkbox"
          checked={agbAccepted}
          onChange={(e) => setAgbAccepted(e.target.checked)}
          className="mt-1"
        />
        <span>
          Ich habe die <a href="/api/agb/pdf" target="_blank" rel="noopener noreferrer" className="underline">AGB</a> gelesen und akzeptiere den Vertrag verbindlich.
        </span>
      </label>

      {state.type === "error" ? (
        <div className="rounded-lg border border-red-500/40 bg-red-900/20 p-3 text-sm text-red-200">{state.message}</div>
      ) : null}

      <Button type="submit" disabled={state.type === "loading"} className="w-full">
        {state.type === "loading" ? "Wird gespeichert..." : "Jetzt verbindlich unterschreiben"}
      </Button>
    </form>
  );
}


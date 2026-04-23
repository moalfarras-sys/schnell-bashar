"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type SubmitState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "success"; signedAt?: string };

export function SignDocumentForm({
  token,
  defaultName,
}: {
  token: string;
  defaultName: string;
}) {
  const [signerName, setSignerName] = useState(defaultName);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [state, setState] = useState<SubmitState>({ type: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consentAccepted) {
      setState({ type: "error", message: "Bitte bestätigen Sie die elektronische Unterschrift." });
      return;
    }

    setState({ type: "loading" });
    const response = await fetch(`/api/documents/sign/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signerName,
        consentAccepted: true,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setState({ type: "error", message: data.error || "Die Unterschrift konnte nicht gespeichert werden." });
      return;
    }

    setState({
      type: "success",
      signedAt: data.signedAt,
    });
  }

  if (state.type === "success") {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-green-900">
        <h2 className="text-lg font-bold">Dokument erfolgreich bestätigt</h2>
        {state.signedAt ? (
          <p className="mt-2 text-sm">
            Zeitstempel: {new Date(state.signedAt).toLocaleString("de-DE")}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="signerName" className="mb-1 block text-sm font-semibold text-slate-800">
          Vollständiger Name
        </label>
        <input
          id="signerName"
          value={signerName}
          onChange={(event) => setSignerName(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
          placeholder="Max Mustermann"
          required
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={consentAccepted}
          onChange={(event) => setConsentAccepted(event.target.checked)}
          className="mt-1"
        />
        <span>
          Ich bestätige die Angaben und erteile eine einfache elektronische Unterschrift.
        </span>
      </label>

      {state.type === "error" ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.message}
        </div>
      ) : null}

      <Button type="submit" disabled={state.type === "loading"} className="w-full">
        {state.type === "loading" ? "Wird gespeichert..." : "Elektronisch bestätigen"}
      </Button>
    </form>
  );
}

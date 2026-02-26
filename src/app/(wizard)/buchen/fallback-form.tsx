"use client";

import { FormEvent, useState } from "react";
import { Loader2, PhoneCall } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export function BookingFallbackForm() {
  const [state, setState] = useState<State>({ status: "idle" });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState("Umzug");
  const [volume, setVolume] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ status: "loading" });

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          website: "",
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          message: message.trim(),
          volumeM3: volume ? Number(volume) : undefined,
          serviceType: service,
          source: "booking_fallback",
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = typeof data?.error === "string" ? data.error : "Anfrage konnte nicht gesendet werden.";
        throw new Error(msg);
      }

      setState({
        status: "success",
        message:
          "Ihre Anfrage wurde gesendet. Wir melden uns schnellstmÃ¶glich per Telefon oder E-Mail.",
      });
      setName("");
      setPhone("");
      setEmail("");
      setVolume("");
      setMessage("");
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Senden fehlgeschlagen.",
      });
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-xs font-bold text-slate-600">Name *</div>
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-600">Telefon *</div>
          <Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+49 ..." />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-600">E-Mail *</div>
          <Input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@email.de"
          />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-600">Leistung</div>
          <Select value={service} onChange={(e) => setService(e.target.value)}>
            <option value="Umzug">Umzug</option>
            <option value="Entsorgung">Entsorgung</option>
            <option value="Umzug + Entsorgung">Umzug + Entsorgung</option>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <div className="text-xs font-bold text-slate-600">Anzahl der Kubikmeter (optional)</div>
          <Input
            type="number"
            min={0}
            step={0.5}
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            placeholder="z. B. 10"
          />
        </div>
      </div>

      <div>
        <div className="text-xs font-bold text-slate-600">Nachricht *</div>
        <Textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Kurz beschreiben: Start/Ziel, gewÃ¼nschter Zeitraum, besondere Hinweise."
        />
      </div>

      {state.status === "error" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
          {state.message}
        </div>
      ) : null}
      {state.status === "success" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {state.message}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={state.status === "loading"}>
          {state.status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PhoneCall className="h-4 w-4" />
          )}
          Anfrage senden
        </Button>
        <a className="text-sm font-bold text-brand-700 hover:underline" href="tel:+491729573681">
          Oder direkt anrufen: +49 172 9573681
        </a>
      </div>
    </form>
  );
}

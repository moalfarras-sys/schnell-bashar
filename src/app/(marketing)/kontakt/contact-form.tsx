"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export function ContactForm() {
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [volume, setVolume] = useState("");
  const [serviceType, setServiceType] = useState("Umzug");
  const [message, setMessage] = useState("");

  const volumeNumber = useMemo(() => {
    if (!volume.trim()) return undefined;
    const parsed = Number(volume);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [volume]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ type: "loading" });

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          website: "",
          source: "contact_page",
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          volumeM3: volumeNumber,
          serviceType,
          message: message.trim(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = typeof data?.error === "string" ? data.error : "Anfrage konnte nicht gesendet werden.";
        throw new Error(msg);
      }

      setStatus({
        type: "success",
        message: "Vielen Dank. Ihre Anfrage wurde gesendet, wir melden uns schnellstm?glich.",
      });
      setName("");
      setEmail("");
      setPhone("");
      setVolume("");
      setMessage("");
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Senden fehlgeschlagen.",
      });
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-xs font-semibold text-slate-800">Name *</div>
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-800">E-Mail *</div>
          <Input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@email.de"
          />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-800">Telefon (optional)</div>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+49 ..." />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-800">Leistung</div>
          <Select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
            <option value="Umzug">Umzug</option>
            <option value="Entsorgung">Entsorgung / Sperrmll</option>
            <option value="Montage">Montage</option>
            <option value="Umzug + Entsorgung">Umzug + Entsorgung</option>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <div className="text-xs font-semibold text-slate-800">Anzahl der Kubikmeter (optional)</div>
          <Input
            type="number"
            min={0}
            step={0.5}
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            placeholder="z. B. 12"
          />
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-800">Nachricht *</div>
        <Textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Teilen Sie uns Ihre Anfrage mit, wir melden uns schnellstm?glich."
        />
      </div>

      {status.type === "error" ? (
        <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">
          {status.message}
        </div>
      ) : null}
      {status.type === "success" ? (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          {status.message}
        </div>
      ) : null}

      <Button type="submit" disabled={status.type === "loading"}>
        {status.type === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MailCheck className="h-4 w-4" />
        )}
        Anfrage schicken
      </Button>
    </form>
  );
}


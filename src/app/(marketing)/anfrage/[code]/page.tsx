"use client";

import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, MapPin, Search } from "lucide-react";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderTimeline } from "@/components/order-timeline";

type TrackingData = {
  trackingCode: string;
  status: string;
  statusLabel: string;
  customerName: string;
  serviceType: string;
  speed: string;
  date: string;
  time: string;
  requestedWindow?: string | null;
  fromAddress: string;
  toAddress: string;
  volumeM3: number;
  priceNet: number;
  priceGross: number;
  createdAt: string;
};

function serviceLabel(s: string) {
  return s === "MOVING" ? "Umzug" : s === "DISPOSAL" ? "Entsorgung" : "Umzug + Entsorgung";
}

function speedLabel(s: string) {
  return s === "ECONOMY" ? "Günstig" : s === "EXPRESS" ? "Express" : "Standard";
}

function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export default function AnfrageCodePage() {
  const params = useParams();
  const code = typeof params.code === "string" ? params.code : "";

  const [email, setEmail] = useState("");
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !code) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const params = new URLSearchParams({ orderId: code, email: trimmedEmail });
      const res = await fetch(`/api/tracking?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json?.error || "Keine Anfrage mit diesen Daten gefunden.");
        return;
      }

      setData(json);
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  }

  if (!code) {
    return (
      <Container className="py-14">
        <div className="mx-auto max-w-xl text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-extrabold text-slate-950 dark:text-white">Ungültiger Link</h1>
          <p className="mt-4 text-slate-700 dark:text-slate-300">
            Bitte geben Sie Ihren Tracking-Code auf der Anfrage-Seite ein.
          </p>
          <Link href="/anfrage" className="mt-6 inline-block">
            <Button size="lg" className="gap-2">
              <Search className="h-5 w-5" />
              Zur Anfrage-Suche
            </Button>
          </Link>
        </div>
      </Container>
    );
  }

  if (data) {
    const slotLabel = data.requestedWindow || `${data.date} ${data.time}`;

    return (
      <Container className="py-14">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            Anfrage verfolgen
          </h1>
          <p className="mt-2 text-slate-700 dark:text-slate-400">Tracking-Code: {data.trackingCode}</p>

          <div className="mt-8 rounded-3xl border-2 border-slate-200 bg-[color:var(--surface-elevated)] p-6 shadow-md backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-brand-300 bg-brand-50 px-4 py-1.5 text-sm font-bold text-brand-800 dark:border-brand-500/40 dark:bg-brand-950/40 dark:text-brand-300">
                <CheckCircle2 className="h-4 w-4" />
                {data.statusLabel}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {serviceLabel(data.serviceType)} · {speedLabel(data.speed)}
              </span>
            </div>

            {data.status === "REQUESTED" ? (
              <div className="mt-4 rounded-2xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 dark:border-blue-500/40 dark:bg-blue-950/30 dark:text-blue-200">
                Termin angefragt: Unser Team prüft die Anfrage und bestätigt Ihren finalen Termin zeitnah per E-Mail.
              </div>
            ) : null}

            <div className="mt-6 space-y-3 text-sm">
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-400">Kunde:</span>{" "}
                <span className="text-slate-800 dark:text-slate-200">{data.customerName}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  {data.status === "REQUESTED" ? "Wunschtermin:" : "Termin:"}
                </span>{" "}
                <span className="text-slate-800 dark:text-slate-200">
                  {data.requestedWindow || `${data.date}  ${data.time}`}
                </span>
              </div>
              {data.fromAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-500" />
                  <div>
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Von:</span>{" "}
                    <span className="text-slate-800 dark:text-slate-200">{data.fromAddress}</span>
                  </div>
                </div>
              )}
              {data.toAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-500" />
                  <div>
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Nach:</span>{" "}
                    <span className="text-slate-800 dark:text-slate-200">{data.toAddress}</span>
                  </div>
                </div>
              )}
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-400">Volumen:</span>{" "}
                <span className="text-slate-800 dark:text-slate-200">ca. {data.volumeM3} m³</span>
              </div>
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-400">Preis:</span>{" "}
                <span className="text-slate-800 dark:text-slate-200">{eur(data.priceGross)} inkl. MwSt.</span>
              </div>
            </div>

            <OrderTimeline
              status={data.status}
              createdAt={data.createdAt}
              slotLabel={slotLabel}
            />
          </div>

          <div className="mt-6 text-center">
            <Link href="/anfrage">
              <Button variant="outline" size="lg" className="gap-2">
                <Search className="h-5 w-5" />
                Andere Anfrage suchen
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-14">
      <div className="mx-auto max-w-xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
          Anfrage verfolgen
        </h1>
        <p className="mt-4 text-slate-700 dark:text-slate-300">
          Geben Sie Ihre E-Mail-Adresse ein, um den Status Ihrer Anfrage einzusehen. Die E-Mail muss
          mit der bei der Buchung angegebenen Adresse übereinstimmen.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 rounded-3xl border-2 border-slate-200 bg-[color:var(--surface-elevated)] p-6 shadow-md backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80"
        >
          <div>
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">Tracking-Code</label>
            <Input
              value={code}
              readOnly
              className="mt-1 bg-slate-50 dark:bg-slate-800/60"
            />
          </div>
          <div className="mt-4">
            <label htmlFor="email" className="block text-sm font-bold text-slate-800 dark:text-slate-200">
              E-Mail-Adresse
            </label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@email.de"
              className="mt-1"
            />
          </div>

          {error && (
            <div className="mt-4 rounded-xl border-2 border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <Button type="submit" className="mt-6 gap-2" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Prüfen...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                Status prüfen
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
          Den Tracking-Code finden Sie in Ihrer Buchungsbestätigung per E-Mail.
        </p>

        <div className="mt-6 text-center">
          <Link href="/anfrage" className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Anderen Code eingeben
          </Link>
        </div>
      </div>
    </Container>
  );
}


"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calculator, Recycle, Truck, Wrench } from "lucide-react";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

type ServiceType = "UMZUG" | "ENTSORGUNG" | "MONTAGE";
type SizeOption = string;
type UrgencyType = "NORMAL" | "EXPRESS" | "WEEKEND";

const SERVICE_OPTIONS: { value: ServiceType; label: string; icon: typeof Truck }[] = [
  { value: "UMZUG", label: "Umzug", icon: Truck },
  { value: "ENTSORGUNG", label: "Entsorgung", icon: Recycle },
  { value: "MONTAGE", label: "Montage", icon: Wrench },
];

const UMZUG_SIZES = [
  { value: "1-2", label: "1–2 Zimmer", volumeM3: 20 },
  { value: "3", label: "3 Zimmer", volumeM3: 42 },
  { value: "4+", label: "4+ Zimmer / Haus", volumeM3: 65 },
];

const ENTSORGUNG_SIZES = [
  { value: "1-5", label: "1–5 m³", volumeM3: 3 },
  { value: "6-10", label: "6–10 m³", volumeM3: 8 },
  { value: "11-20", label: "11–20 m³", volumeM3: 15 },
];

const MONTAGE_SIZES = [
  { value: "1-3", label: "1–3 Teile", volumeM3: 1 },
  { value: "4-8", label: "4–8 Teile", volumeM3: 2 },
  { value: "9+", label: "9+ Teile", volumeM3: 3 },
];

const URGENCY_OPTIONS: { value: UrgencyType; label: string }[] = [
  { value: "NORMAL", label: "Normal" },
  { value: "EXPRESS", label: "Express" },
  { value: "WEEKEND", label: "Wochenende" },
];

function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

function calcQuickPrice(
  service: ServiceType,
  volumeM3: number,
  urgency: UrgencyType,
  hasMontageAddon: boolean
): number {
  const baseFee: Record<ServiceType, number> = {
    UMZUG: 19000,
    ENTSORGUNG: 14000,
    MONTAGE: 19000,
  };
  const perM3: Record<ServiceType, number> = {
    UMZUG: 3400,
    ENTSORGUNG: 4800,
    MONTAGE: 3400,
  };
  const speedMult: Record<UrgencyType, number> = {
    NORMAL: 1.0,
    EXPRESS: 1.3,
    WEEKEND: 0.9,
  };
  const montageAddon = 3500;

  const base = baseFee[service];
  const vol = volumeM3 * perM3[service];
  const addon = hasMontageAddon ? montageAddon : 0;
  let subtotal = base + vol + addon;
  subtotal = Math.round(subtotal * speedMult[urgency]);
  const vatCents = Math.round(subtotal * 0.19);
  return subtotal + vatCents;
}

function buildPreiseUrl(
  service: ServiceType,
  volumeM3: number,
  urgency: UrgencyType,
  sizeValue: string
): string {
  const speed =
    urgency === "NORMAL" ? "STANDARD" : urgency === "EXPRESS" ? "EXPRESS" : "ECONOMY";
  const params = new URLSearchParams();
  params.set("service", service === "MONTAGE" ? "UMZUG" : service);
  params.set("volumeM3", String(volumeM3));
  params.set("speed", speed);
  if (service === "MONTAGE") {
    params.set("addons", "DISMANTLE_ASSEMBLE");
  }
  return `/preise?${params.toString()}`;
}

export function QuickEstimateWidget() {
  const [service, setService] = useState<ServiceType>("UMZUG");
  const [sizeValue, setSizeValue] = useState<string>("");
  const [urgency, setUrgency] = useState<UrgencyType>("NORMAL");

  const sizeOptions =
    service === "UMZUG"
      ? UMZUG_SIZES
      : service === "ENTSORGUNG"
        ? ENTSORGUNG_SIZES
        : MONTAGE_SIZES;

  const volumeM3 = useMemo(() => {
    if (!sizeValue) return service === "UMZUG" ? 20 : service === "ENTSORGUNG" ? 3 : 1;
    const found = sizeOptions.find((s) => s.value === sizeValue);
    return found?.volumeM3 ?? (service === "UMZUG" ? 20 : service === "ENTSORGUNG" ? 3 : 1);
  }, [service, sizeValue, sizeOptions]);

  const grossCents = useMemo(
    () =>
      calcQuickPrice(
        service,
        volumeM3,
        urgency,
        service === "MONTAGE"
      ),
    [service, volumeM3, urgency]
  );

  const preiseUrl = useMemo(
    () => buildPreiseUrl(service, volumeM3, urgency, sizeValue),
    [service, volumeM3, urgency, sizeValue]
  );

  const segmentBase = "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200";
  const segmentActive = "border-[rgba(47,140,255,0.28)] bg-[rgba(47,140,255,0.10)] text-brand-700 shadow-[0_0_0_0.5px_rgba(47,140,255,0.12),0_2px_8px_rgba(47,140,255,0.10),inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-sm dark:border-brand-500 dark:bg-brand-900/30 dark:text-brand-300 dark:shadow-none dark:backdrop-blur-none";
  const segmentInactive = "border-[rgba(255,255,255,0.55)] bg-[rgba(255,255,255,0.50)] text-slate-600 shadow-[0_0_0_0.5px_rgba(10,16,32,0.03),inset_0_1px_0_rgba(255,255,255,0.50)] backdrop-blur-sm hover:bg-[rgba(255,255,255,0.70)] hover:text-slate-800 hover:border-[rgba(255,255,255,0.70)] dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-slate-600 dark:backdrop-blur-none dark:shadow-none";

  return (
    <section className="relative overflow-hidden section-divider-glow">
      <div className="absolute inset-0 bg-linear-to-b from-transparent to-[rgba(240,248,255,0.40)] dark:from-slate-950 dark:to-slate-900/50" />
      <Container className="relative py-16 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl border border-[rgba(255,255,255,0.65)] bg-[rgba(255,255,255,0.68)] p-6 shadow-[0_0_0_0.5px_rgba(10,16,32,0.04),0_14px_40px_rgba(10,16,32,0.07),inset_0_1px_0_rgba(255,255,255,0.80)] backdrop-blur-xl dark:border-brand-500/30 dark:bg-slate-900/80 dark:shadow-[0_16px_48px_rgba(59,130,246,0.12)] dark:backdrop-blur-none sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-[#3888f0] to-[#5ca5f7] text-white shadow-[0_4px_14px_rgba(47,140,255,0.25),inset_0_1px_0_rgba(255,255,255,0.25)] dark:from-brand-500 dark:to-brand-400 dark:shadow-md">
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                  Sofort-Preis-Schätzung
                </h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Nur 3 Fragen – unverbindliche Orientierung
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-6">
              <fieldset>
                <legend className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  1. Leistung
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {SERVICE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setService(opt.value);
                          setSizeValue("");
                        }}
                        className={`flex flex-col items-center gap-1.5 ${segmentBase} py-3 ${
                          service === opt.value ? segmentActive : segmentInactive
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  2. Größe
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {sizeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSizeValue(opt.value)}
                      className={`${segmentBase} ${
                        sizeValue === opt.value ? segmentActive : segmentInactive
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  3. Termindringlichkeit
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {URGENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setUrgency(opt.value as UrgencyType)}
                      className={`${segmentBase} ${
                        urgency === opt.value ? segmentActive : segmentInactive
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="mt-7 rounded-2xl border border-[rgba(47,140,255,0.18)] bg-[rgba(47,140,255,0.06)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.50)] backdrop-blur-sm dark:border-brand-500/50 dark:from-brand-950/50 dark:to-blue-950/30 dark:bg-brand-950/40 dark:shadow-none dark:backdrop-blur-none">
              <div className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                Preis ab (brutto)
              </div>
              <div className="mt-1.5 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                {eur(grossCents)}
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Unverbindliche Schätzung. Der Endpreis wird nach Prüfung bestätigt.
              </p>
            </div>

            <Link href={preiseUrl} className="mt-6 block">
              <Button size="lg" className="w-full gap-2">
                Details eingeben & Angebot erhalten
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

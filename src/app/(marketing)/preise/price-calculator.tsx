"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Calculator,
  CalendarDays,
  CheckCircle2,
  CirclePercent,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumberDE } from "@/lib/format-number";

type ServiceType = "UMZUG" | "ENTSORGUNG" | "KOMBI";
type SpeedType = "ECONOMY" | "STANDARD" | "EXPRESS";

const ADDON_OPTIONS = [
  { key: "PACKING" as const, label: "Packservice" },
  { key: "DISMANTLE_ASSEMBLE" as const, label: "Möbelmontage" },
  { key: "ENTRUEMPELUNG" as const, label: "Entrümpelung" },
] as const;

const ADDON_SURCHARGES_CENTS: Record<string, number> = {
  PACKING: 2500,
  DISMANTLE_ASSEMBLE: 3500,
  ENTRUEMPELUNG: 4000,
};

export type PricingData = {
  movingBaseFeeCents: number;
  disposalBaseFeeCents: number;
  perM3MovingCents: number;
  perM3DisposalCents: number;
  stairsSurchargePerFloorCents: number;
  parkingSurchargeHardCents: number;
  uncertaintyPercent: number;
  economyMultiplier: number;
  standardMultiplier: number;
  expressMultiplier: number;
};

type PriceBreakdown = {
  baseCents: number;
  volumeCents: number;
  floorsCents: number;
  parkingCents: number;
  addonsCents: number;
  driveChargeCents: number;
  subtotalCents: number;
  minCents: number;
  maxCents: number;
  distanceKm?: number;
  distanceSource?: "approx" | "ors" | "cache" | "fallback";
};

type CalculatedEstimate = {
  baseCents: number;
  volumeCents: number;
  floorsCents: number;
  parkingCents: number;
  addonsCents: number;
  driveChargeCents: number;
  subtotalCents: number;
  minCents: number;
  maxCents: number;
  netCents: number;
  vatCents: number;
  grossCents: number;
  distanceKm?: number;
  distanceSource?: "approx" | "ors" | "cache" | "fallback";
};

type PriceCalcApiResponse = {
  priceNet: number;
  vat: number;
  priceGross: number;
  breakdown: PriceBreakdown;
};

function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

const serviceLabels: Record<ServiceType, string> = {
  UMZUG: "Umzug",
  ENTSORGUNG: "Entsorgung / Sperrmüll",
  KOMBI: "Umzug + Entsorgung",
};

const speedLabels: Record<SpeedType, string> = {
  ECONOMY: "Günstig",
  STANDARD: "Standard",
  EXPRESS: "Express",
};

const speedDescriptions: Record<SpeedType, string> = {
  ECONOMY: "Günstiger, flexibler Termin",
  STANDARD: "Schnelle Rückmeldung",
  EXPRESS: "Priorisierte Planung",
};

function distanceSourceLabel(source?: CalculatedEstimate["distanceSource"]) {
  if (source === "ors") return "OpenRouteService";
  if (source === "cache") return "PLZ-Cache";
  if (source === "fallback") return "Fallback";
  return "Schätzung";
}

const INQUIRY_STORAGE_KEY = "ssu_inquiry";

export function PriceCalculator({ pricing, externalVolumeM3 }: { pricing?: PricingData | null; externalVolumeM3?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const paramService = searchParams.get("service");
  const paramVolume = searchParams.get("volumeM3");
  const paramSpeed = searchParams.get("speed");
  const paramAddons = searchParams.get("addons");

  const [service, setService] = useState<ServiceType>(() => {
    if (paramService === "UMZUG" || paramService === "ENTSORGUNG" || paramService === "KOMBI")
      return paramService;
    return "UMZUG";
  });
  const [speed, setSpeed] = useState<SpeedType>(() => {
    if (paramSpeed === "ECONOMY" || paramSpeed === "STANDARD" || paramSpeed === "EXPRESS")
      return paramSpeed;
    return "STANDARD";
  });
  const [volumeM3, setVolumeM3] = useState(() => {
    const v = Number(paramVolume);
    return !Number.isNaN(v) && v >= 1 && v <= 200 ? v : 12;
  });
  const [floors, setFloors] = useState(0);
  const [hasElevator, setHasElevator] = useState(false);
  const [needNoParkingZone, setNeedNoParkingZone] = useState(false);
  const [addons, setAddons] = useState<string[]>(() => {
    if (!paramAddons || typeof paramAddons !== "string") return [];
    return paramAddons
      .split(",")
      .map((a) => a.trim())
      .filter((a) => ADDON_OPTIONS.some((o) => o.key === a));
  });
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [serverEstimate, setServerEstimate] = useState<CalculatedEstimate | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  useEffect(() => {
    if (paramService === "UMZUG" || paramService === "ENTSORGUNG" || paramService === "KOMBI")
      setService(paramService);
    if (paramSpeed === "ECONOMY" || paramSpeed === "STANDARD" || paramSpeed === "EXPRESS")
      setSpeed(paramSpeed);
    const v = Number(paramVolume);
    if (!Number.isNaN(v) && v >= 1 && v <= 200) setVolumeM3(v);
    if (paramAddons && typeof paramAddons === "string") {
      const list = paramAddons
        .split(",")
        .map((a) => a.trim())
        .filter((a) => ADDON_OPTIONS.some((o) => o.key === a));
      setAddons(list);
    }
  }, [paramService, paramSpeed, paramVolume, paramAddons]);

  useEffect(() => {
    if (externalVolumeM3 !== undefined && externalVolumeM3 >= 1 && externalVolumeM3 <= 200) {
      setVolumeM3(externalVolumeM3);
    }
  }, [externalVolumeM3]);

  const localEstimate = useMemo<CalculatedEstimate>(() => {
    let baseCents: number;
    let volumeCents: number;

    if (pricing) {
      const baseMove = pricing.movingBaseFeeCents;
      const baseDisposal = pricing.disposalBaseFeeCents;
      const perM3Move = pricing.perM3MovingCents;
      const perM3Disposal = pricing.perM3DisposalCents;

      if (service === "UMZUG") {
        baseCents = baseMove;
        volumeCents = volumeM3 * perM3Move;
      } else if (service === "ENTSORGUNG") {
        baseCents = baseDisposal;
        volumeCents = volumeM3 * perM3Disposal;
      } else {
        baseCents = baseMove + baseDisposal;
        volumeCents = volumeM3 * (perM3Move + perM3Disposal) / 2;
      }
    } else {
      const baseFee: Record<ServiceType, number> = {
        UMZUG: 19000,
        ENTSORGUNG: 14000,
        KOMBI: 29000,
      };
      const perM3: Record<ServiceType, number> = {
        UMZUG: 3400,
        ENTSORGUNG: 4800,
        KOMBI: 6200,
      };
      baseCents = baseFee[service];
      volumeCents = volumeM3 * perM3[service];
    }

    let floorsCents = 0;
    if (floors > 0 && !hasElevator) {
      const perFloor = pricing?.stairsSurchargePerFloorCents ?? 2500;
      floorsCents = floors * perFloor;
    }

    let parkingCents = 0;
    if (needNoParkingZone) {
      parkingCents = pricing?.parkingSurchargeHardCents ?? 12000;
    }

    let addonsCents = 0;
    for (const a of addons) {
      addonsCents += ADDON_SURCHARGES_CENTS[a] ?? 0;
    }

    let subtotalCents = baseCents + volumeCents + floorsCents + parkingCents + addonsCents;

    const speedMult = pricing
      ? { ECONOMY: pricing.economyMultiplier, STANDARD: pricing.standardMultiplier, EXPRESS: pricing.expressMultiplier }
      : { ECONOMY: 0.9, STANDARD: 1.0, EXPRESS: 1.3 };

    subtotalCents = Math.round(subtotalCents * speedMult[speed]);

    const uncertainty = pricing?.uncertaintyPercent ?? 12;
    const minCents = Math.max(0, Math.round(subtotalCents * (1 - uncertainty / 100)));
    const maxCents = Math.round(subtotalCents * (1 + uncertainty / 100));

    const vatRate = 0.19;
    const netCents = maxCents;
    const vatCents = Math.round(netCents * vatRate);
    const grossCents = netCents + vatCents;

    return {
      baseCents,
      volumeCents,
      floorsCents,
      parkingCents,
      addonsCents,
      driveChargeCents: 0,
      subtotalCents,
      minCents,
      maxCents,
      netCents,
      vatCents,
      grossCents,
    };
  }, [service, speed, volumeM3, floors, hasElevator, needNoParkingZone, addons, pricing]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setCalcLoading(true);
      setCalcError(null);

      try {
        const res = await fetch("/api/price/calc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            serviceType: service,
            speed,
            volumeM3,
            floors,
            hasElevator,
            needNoParkingZone,
            addons,
            fromAddress: fromAddress.trim() || undefined,
            toAddress: toAddress.trim() || undefined,
          }),
        });

        const json = (await res.json().catch(() => null)) as
          | PriceCalcApiResponse
          | { error?: string }
          | null;
        if (!res.ok) {
          throw new Error(
            (json && "error" in json && json.error) ||
              "Preisberechnung konnte nicht durchgeführt werden.",
          );
        }
        if (!json || !("breakdown" in json)) {
          throw new Error("Ungültige Antwort vom Preisservice.");
        }

        if (cancelled) return;
        setServerEstimate({
          baseCents: json.breakdown.baseCents,
          volumeCents: json.breakdown.volumeCents,
          floorsCents: json.breakdown.floorsCents,
          parkingCents: json.breakdown.parkingCents,
          addonsCents: json.breakdown.addonsCents,
          driveChargeCents: json.breakdown.driveChargeCents,
          subtotalCents: json.breakdown.subtotalCents,
          minCents: json.breakdown.minCents,
          maxCents: json.breakdown.maxCents,
          netCents: json.priceNet,
          vatCents: json.vat,
          grossCents: json.priceGross,
          distanceKm: json.breakdown.distanceKm,
          distanceSource: json.breakdown.distanceSource,
        });
      } catch (error) {
        if (cancelled) return;
        if (error instanceof Error && error.name === "AbortError") return;
        setServerEstimate(null);
        setCalcError(
          error instanceof Error
            ? error.message
            : "Preisberechnung konnte nicht durchgeführt werden.",
        );
      } finally {
        if (!cancelled) setCalcLoading(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [
    service,
    speed,
    volumeM3,
    floors,
    hasElevator,
    needNoParkingZone,
    addons,
    fromAddress,
    toAddress,
  ]);

  const estimate = serverEstimate ?? localEstimate;
  const needsRoute = service === "UMZUG" || service === "KOMBI";
  const hasRouteAddresses = fromAddress.trim().length > 0 && toAddress.trim().length > 0;

  return (
    <div className="rounded-3xl border-2 border-slate-300 bg-[color:var(--surface-elevated)] p-6 shadow-lg sm:p-8 dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 shadow-sm dark:bg-brand-900/40 dark:text-brand-400">
          <Calculator className="h-5 w-5" />
        </div>
        <div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-white">Preisrechner</div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">Unverbindliche Orientierung</div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {/* Service Type */}
        <fieldset>
          <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Leistung
          </legend>
          <div className="grid gap-2">
            {(["UMZUG", "ENTSORGUNG", "KOMBI"] as ServiceType[]).map((s) => (
              <label
                key={s}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${service === s
                    ? "border-brand-500 bg-brand-50 text-brand-800 shadow-md dark:bg-brand-900/30 dark:text-brand-300"
                    : "border-slate-300 bg-[color:var(--surface-elevated)] text-slate-800 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700/60"
                  }`}
              >
                <input
                  type="radio"
                  name="service"
                  value={s}
                  checked={service === s}
                  onChange={() => setService(s)}
                  className="sr-only"
                />
                <div
                  className={`h-4 w-4 shrink-0 rounded-full border-2 ${service === s ? "border-brand-500 bg-brand-500" : "border-slate-300 dark:border-slate-600"
                    }`}
                >
                  {service === s && (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </div>
                {serviceLabels[s]}
              </label>
            ))}
          </div>
        </fieldset>

        {/* Speed Type */}
        <fieldset>
          <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Priorität
          </legend>
          <div className="grid gap-2">
            {(["ECONOMY", "STANDARD", "EXPRESS"] as SpeedType[]).map((s) => (
              <label
                key={s}
                className={`flex cursor-pointer items-center justify-between rounded-xl border-2 px-4 py-3 text-sm transition-all ${speed === s
                    ? "border-brand-500 bg-brand-50 shadow-md dark:bg-brand-900/30"
                    : "border-slate-300 bg-[color:var(--surface-elevated)] hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800/60 dark:hover:border-slate-500 dark:hover:bg-slate-700/60"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="speed"
                    value={s}
                    checked={speed === s}
                    onChange={() => setSpeed(s)}
                    className="sr-only"
                  />
                  <div
                    className={`h-4 w-4 shrink-0 rounded-full border-2 ${speed === s ? "border-brand-500 bg-brand-500" : "border-slate-300 dark:border-slate-600"
                      }`}
                  >
                    {speed === s && (
                      <div className="flex h-full w-full items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                  <span className={`font-semibold ${speed === s ? "text-brand-800 dark:text-brand-300" : "text-slate-700 dark:text-slate-200"}`}>
                    {speedLabels[s]}
                  </span>
                </div>
                <span className={`text-xs ${speed === s ? "text-brand-700 dark:text-brand-400" : "text-slate-600 dark:text-slate-400"}`}>
                  {speedDescriptions[s]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Volume */}
      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="volume-input"
            className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
          >
            Volumen (m³)
          </label>
          <div className="flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-[color:var(--surface-elevated)] px-3 py-1.5 shadow-sm dark:border-slate-600 dark:bg-slate-800/60">
            <button
              type="button"
              onClick={() => setVolumeM3((v) => Math.max(1, v - 1))}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-lg font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              aria-label="Volumen verringern"
            >
              -
            </button>
            <input
              id="volume-input"
              type="number"
              min={1}
              max={200}
              value={volumeM3}
              onChange={(e) => setVolumeM3(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-14 border-0 bg-transparent p-0 text-center text-sm font-extrabold text-slate-900 focus:outline-none focus:ring-0 dark:text-white"
              aria-label="Volumen in Kubikmetern"
            />
            <button
              type="button"
              onClick={() => setVolumeM3((v) => Math.min(200, v + 1))}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-lg font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              aria-label="Volumen erhöhen"
            >
              +
            </button>
          </div>
        </div>
        <input
          type="range"
          min={1}
          max={80}
          value={Math.min(volumeM3, 80)}
          onChange={(e) => setVolumeM3(Number(e.target.value))}
          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-600 dark:bg-slate-700"
          aria-label="Volumen Schieberegler"
        />
        <div className="mt-1 flex justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>1 m³</span>
          <span>80 m³</span>
        </div>
      </div>

      {/* Addresses */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="from-address" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Von (PLZ + Straße)
          </label>
          <Input
            id="from-address"
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            placeholder="z.B. 12043 Berlin, Anzengruber Str. 9"
            className="border-2 border-slate-300"
          />
        </div>
        <div>
          <label htmlFor="to-address" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Nach (PLZ + Straße)
          </label>
          <Input
            id="to-address"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            placeholder="z.B. 10115 Berlin, Alexanderplatz 1"
            className="border-2 border-slate-300"
          />
        </div>
      </div>

      {needsRoute && !hasRouteAddresses ? (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          Für die genaue Fahrtkosten-Berechnung bitte beide Adressen (Von/Nach) mit PLZ angeben.
        </div>
      ) : null}
      {calcLoading ? (
        <div className="mt-3 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
          Preis wird live berechnet…
        </div>
      ) : null}
      {calcError ? (
        <div className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
          {calcError}
        </div>
      ) : null}

      {/* Extras */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="floors-input"
            className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
          >
            Etagen ohne Aufzug
          </label>
          <div className="flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-[color:var(--surface-elevated)] px-3 py-2 shadow-sm dark:border-slate-600 dark:bg-slate-800/60">
            <button
              type="button"
              onClick={() => setFloors((f) => Math.max(0, f - 1))}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-lg font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              aria-label="Etagen verringern"
            >
              -
            </button>
            <input
              id="floors-input"
              type="number"
              min={0}
              max={10}
              value={floors}
              onChange={(e) => setFloors(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-12 border-0 bg-transparent p-0 text-center text-sm font-extrabold text-slate-900 focus:outline-none focus:ring-0 dark:text-white"
              aria-label="Anzahl der Etagen"
            />
            <button
              type="button"
              onClick={() => setFloors((f) => Math.min(10, f + 1))}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-lg font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              aria-label="Etagen erhöhen"
            >
              +
            </button>
          </div>
        </div>

        <label
          className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${hasElevator
              ? "border-brand-500 bg-brand-50 text-brand-800 shadow-md dark:bg-brand-900/30 dark:text-brand-300"
              : "border-slate-300 bg-[color:var(--surface-elevated)] text-slate-800 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-slate-500"
            }`}
        >
          <input
            type="checkbox"
            checked={hasElevator}
            onChange={(e) => setHasElevator(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-brand-600"
          />
          Aufzug vorhanden
        </label>
        <label
          className={`flex cursor-pointer items-center gap-3 self-end rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${needNoParkingZone
              ? "border-brand-500 bg-brand-50 text-brand-800 shadow-md dark:bg-brand-900/30 dark:text-brand-300"
              : "border-slate-300 bg-[color:var(--surface-elevated)] text-slate-800 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-slate-500"
            }`}
        >
          <input
            type="checkbox"
            checked={needNoParkingZone}
            onChange={(e) => setNeedNoParkingZone(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-brand-600"
          />
          Halteverbotszone benötigt
        </label>
      </div>

      {/* Zusatzleistungen */}
      <div className="mt-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Zusatzleistungen
        </div>
        <div className="flex flex-wrap gap-2">
          {ADDON_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all ${addons.includes(opt.key)
                  ? "border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300"
                  : "border-slate-300 bg-[color:var(--surface-elevated)] text-slate-700 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-slate-500"
                }`}
            >
              <input
                type="checkbox"
                checked={addons.includes(opt.key)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setAddons((a) => [...a, opt.key]);
                  } else {
                    setAddons((a) => a.filter((x) => x !== opt.key));
                  }
                }}
                className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-brand-600"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="mt-6 rounded-2xl border-2 border-slate-300 bg-slate-50 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          <Info className="h-3.5 w-3.5" />
          Preisdetails
        </div>
        <div className="grid gap-1.5 text-sm">
          <div className="flex justify-between text-slate-700 dark:text-slate-400">
            <span>Grundgebühr ({serviceLabels[service]})</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{eur(estimate.baseCents)}</span>
          </div>
          <div className="flex justify-between text-slate-700 dark:text-slate-400">
            <span>Volumen ({formatNumberDE(volumeM3)} m³)</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{eur(estimate.volumeCents)}</span>
          </div>
          {estimate.floorsCents > 0 && (
            <div className="flex justify-between text-slate-700 dark:text-slate-400">
              <span>Treppenzuschlag ({floors} Etagen)</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{eur(estimate.floorsCents)}</span>
            </div>
          )}
          {estimate.parkingCents > 0 && (
            <div className="flex justify-between text-slate-700 dark:text-slate-400">
              <span>Halteverbotszone</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{eur(estimate.parkingCents)}</span>
            </div>
          )}
          {estimate.addonsCents > 0 && (
            <div className="flex justify-between text-slate-700 dark:text-slate-400">
              <span>Zusatzleistungen</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{eur(estimate.addonsCents)}</span>
            </div>
          )}
          {estimate.driveChargeCents > 0 && (
            <div className="flex justify-between text-slate-700 dark:text-slate-400">
              <span>
                Fahrtkosten
                {estimate.distanceKm != null
                  ? ` (${formatNumberDE(estimate.distanceKm)} km)`
                  : ""}
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {eur(estimate.driveChargeCents)}
              </span>
            </div>
          )}
          {estimate.distanceKm != null && (
            <div className="flex justify-between text-slate-700 dark:text-slate-400">
              <span>Distanz-Quelle</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {distanceSourceLabel(estimate.distanceSource)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-slate-700 dark:text-slate-400">
            <span>Priorität ({speedLabels[speed]})</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {speed === "ECONOMY" ? "−10 %" : speed === "EXPRESS" ? "+30 %" : "±0 %"}
            </span>
          </div>
          <div className="my-1 border-t-2 border-slate-300 dark:border-slate-600" />
          <div className="flex justify-between text-slate-800 dark:text-slate-200">
            <span className="font-semibold">Netto (geschätzt)</span>
            <span className="font-bold">{eur(estimate.netCents)}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>zzgl. MwSt. (19 %)</span>
            <span className="font-semibold">{eur(estimate.vatCents)}</span>
          </div>
        </div>
      </div>

      {/* Price Result */}
      <div className="mt-4 rounded-2xl border-2 border-brand-400 bg-linear-to-r from-brand-50 to-blue-50 p-5 shadow-md dark:from-brand-900/30 dark:to-blue-900/20 dark:border-brand-600/50">
        <div className="flex items-center gap-2">
          <CirclePercent className="h-5 w-5 text-brand-700 dark:text-brand-400" />
          <span className="text-sm font-bold text-brand-900 dark:text-brand-300">Geschätzter Preisrahmen</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            {eur(estimate.minCents)}
          </span>
          <span className="text-lg font-bold text-slate-600 dark:text-slate-400">–</span>
          <span className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            {eur(estimate.maxCents)}
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-700 dark:text-slate-400">
          inkl. MwSt.: {eur(estimate.grossCents)} (Basis: Obergrenze)
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          className="w-full flex-1 gap-2"
          onClick={() => {
            if ((service === "UMZUG" || service === "KOMBI") && !hasRouteAddresses) {
              setCalcError("Bitte geben Sie für Umzug/Kombi sowohl Von- als auch Nach-Adresse an.");
              return;
            }
            const inquiry = {
              serviceType: service,
              speed,
              volumeM3,
              floors,
              hasElevator,
              needNoParkingZone,
              addons,
              fromAddress: fromAddress.trim() || undefined,
              toAddress: toAddress.trim() || undefined,
              distanceKm: estimate.distanceKm,
              distanceSource: estimate.distanceSource,
              driveChargeCents: estimate.driveChargeCents,
              price: {
                netCents: estimate.netCents,
                vatCents: estimate.vatCents,
                grossCents: estimate.grossCents,
                minCents: estimate.minCents,
                maxCents: estimate.maxCents,
              },
            };
            if (typeof window !== "undefined") {
              sessionStorage.setItem(INQUIRY_STORAGE_KEY, JSON.stringify(inquiry));
            }
            router.push("/buchung/termin");
          }}
        >
          <CalendarDays className="h-5 w-5" />
          Termin auswählen
          <ArrowRight className="h-4 w-4" />
        </Button>
        <a href="tel:+491729573681" className="flex-1 sm:flex-initial">
          <Button size="lg" variant="outline" className="w-full gap-2">
            Lieber anrufen: +49 172 9573681
          </Button>
        </a>
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
        <span>
          Das finale Angebot bestätigen wir nach kurzer Prüfung. Der Rechner dient als
          unverbindliche Orientierung.
        </span>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Calculator, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumberDE } from "@/lib/format-number";

type ServiceType = "UMZUG" | "ENTSORGUNG" | "KOMBI" | "MONTAGE";
type SpeedType = "ECONOMY" | "STANDARD" | "EXPRESS";

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

export type MontageCalculatorOption = {
  code: string;
  nameDe: string;
  descriptionDe?: string | null;
  defaultPriceCents: number;
  requiresQuantity: boolean;
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
  serviceOptionsCents?: number;
  minimumOrderAppliedCents?: number;
};

type PriceCalcApiResponse = {
  priceNet: number;
  vat: number;
  priceGross: number;
  breakdown: PriceBreakdown;
};

const ADDON_SURCHARGES_CENTS: Record<string, number> = {
  PACKING: 2500,
  DISMANTLE_ASSEMBLE: 3500,
  ENTRUEMPELUNG: 4000,
};

const serviceLabels: Record<ServiceType, string> = {
  UMZUG: "Umzug",
  ENTSORGUNG: "Entsorgung / Sperrmüll",
  KOMBI: "Umzug + Entsorgung",
  MONTAGE: "Montage",
};

const INQUIRY_STORAGE_KEY = "ssu_inquiry";

function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function parseOptions(value: string | null) {
  if (!value) return {} as Record<string, number>;
  return Object.fromEntries(
    value
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => {
        const [code, qtyRaw] = token.split(":");
        const qty = Math.max(1, Math.min(50, Number(qtyRaw || "1") || 1));
        return [code.trim(), qty] as const;
      }),
  );
}

export function PriceCalculator({
  pricing,
  montageOptions = [],
  externalVolumeM3,
}: {
  pricing?: PricingData | null;
  montageOptions?: MontageCalculatorOption[];
  externalVolumeM3?: number;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [service, setService] = useState<ServiceType>(() => {
    const v = sp.get("service");
    return v === "UMZUG" || v === "ENTSORGUNG" || v === "KOMBI" || v === "MONTAGE" ? v : "UMZUG";
  });
  const [speed, setSpeed] = useState<SpeedType>(() => {
    const v = sp.get("speed");
    return v === "ECONOMY" || v === "STANDARD" || v === "EXPRESS" ? v : "STANDARD";
  });
  const [volumeM3, setVolumeM3] = useState<number>(() => {
    const v = Number(sp.get("volumeM3"));
    return Number.isFinite(v) && v >= 1 && v <= 200 ? v : 12;
  });
  const [floors, setFloors] = useState(0);
  const [hasElevator, setHasElevator] = useState(false);
  const [needNoParkingZone, setNeedNoParkingZone] = useState(false);
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [addons, setAddons] = useState<string[]>([]);
  const [selectedServiceOptions, setSelectedServiceOptions] = useState<Record<string, number>>(
    () => parseOptions(sp.get("options")),
  );
  const [calcError, setCalcError] = useState<string | null>(null);
  const [server, setServer] = useState<PriceCalcApiResponse | null>(null);

  useEffect(() => {
    if (externalVolumeM3 && externalVolumeM3 >= 1 && externalVolumeM3 <= 200) setVolumeM3(externalVolumeM3);
  }, [externalVolumeM3]);

  useEffect(() => {
    let cancel = false;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/price/calc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceType: service,
            speed,
            volumeM3,
            floors,
            hasElevator,
            needNoParkingZone,
            addons,
            selectedServiceOptions: Object.entries(selectedServiceOptions).map(([code, qty]) => ({ code, qty })),
            fromAddress: fromAddress.trim() || undefined,
            toAddress: toAddress.trim() || undefined,
          }),
        });
        const json = (await res.json()) as PriceCalcApiResponse | { error?: string };
        if (!res.ok) throw new Error(("error" in json && json.error) || "Preisberechnung fehlgeschlagen.");
        if (!cancel) {
          setServer(json as PriceCalcApiResponse);
          setCalcError(null);
        }
      } catch (e) {
        if (!cancel) {
          setServer(null);
          setCalcError(e instanceof Error ? e.message : "Preisberechnung fehlgeschlagen.");
        }
      }
    }, 350);
    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [service, speed, volumeM3, floors, hasElevator, needNoParkingZone, addons, selectedServiceOptions, fromAddress, toAddress]);

  const local = useMemo(() => {
    const selectedMontage = Object.entries(selectedServiceOptions).reduce((sum, [code, qty]) => {
      const option = montageOptions.find((o) => o.code === code);
      if (!option) return sum;
      const units = option.requiresQuantity ? Math.max(1, qty) : 1;
      return sum + option.defaultPriceCents * units;
    }, 0);
    const base =
      service === "MONTAGE"
        ? pricing?.movingBaseFeeCents ?? 19000
        : service === "ENTSORGUNG"
          ? pricing?.disposalBaseFeeCents ?? 14000
          : service === "KOMBI"
            ? (pricing?.movingBaseFeeCents ?? 19000) + (pricing?.disposalBaseFeeCents ?? 14000)
            : pricing?.movingBaseFeeCents ?? 19000;
    const perM3 =
      service === "MONTAGE"
        ? 0
        : service === "ENTSORGUNG"
          ? pricing?.perM3DisposalCents ?? 4800
          : service === "KOMBI"
            ? Math.round(((pricing?.perM3MovingCents ?? 3400) + (pricing?.perM3DisposalCents ?? 4800)) / 2)
            : pricing?.perM3MovingCents ?? 3400;
    const floorsCents = service === "MONTAGE" ? 0 : floors > 0 && !hasElevator ? floors * (pricing?.stairsSurchargePerFloorCents ?? 2500) : 0;
    const parkingCents = service === "MONTAGE" ? 0 : needNoParkingZone ? pricing?.parkingSurchargeHardCents ?? 12000 : 0;
    const addonsCents = service === "MONTAGE" ? selectedMontage : addons.reduce((sum, key) => sum + (ADDON_SURCHARGES_CENTS[key] ?? 0), 0);
    const speedMult =
      speed === "ECONOMY" ? pricing?.economyMultiplier ?? 0.9 : speed === "EXPRESS" ? pricing?.expressMultiplier ?? 1.3 : pricing?.standardMultiplier ?? 1;
    let subtotalCents = Math.round((base + volumeM3 * perM3 + floorsCents + parkingCents + addonsCents) * speedMult);
    let minimumOrderAppliedCents = 0;
    if (service === "MONTAGE") {
      const min = pricing?.movingBaseFeeCents ?? 19000;
      if (subtotalCents < min) {
        minimumOrderAppliedCents = min - subtotalCents;
        subtotalCents = min;
      }
    }
    const u = (pricing?.uncertaintyPercent ?? 12) / 100;
    const minCents = Math.max(0, Math.round(subtotalCents * (1 - u)));
    const maxCents = Math.round(subtotalCents * (1 + u));
    const vat = Math.round(maxCents * 0.19);
    return {
      breakdown: {
        baseCents: base,
        volumeCents: Math.round(volumeM3 * perM3),
        floorsCents,
        parkingCents,
        addonsCents,
        driveChargeCents: 0,
        subtotalCents,
        minCents,
        maxCents,
        minimumOrderAppliedCents,
      } satisfies PriceBreakdown,
      priceNet: maxCents,
      vat,
      priceGross: maxCents + vat,
    };
  }, [service, speed, volumeM3, floors, hasElevator, needNoParkingZone, addons, selectedServiceOptions, montageOptions, pricing]);

  const estimate = server ?? local;
  const isMontage = service === "MONTAGE";
  const showRouteHint = (service === "UMZUG" || service === "KOMBI") && (!fromAddress.trim() || !toAddress.trim());

  return (
    <div className="rounded-3xl border-2 border-slate-300 bg-[color:var(--surface-elevated)] p-6 shadow-lg sm:p-8 dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400"><Calculator className="h-5 w-5" /></div>
        <div className="text-lg font-extrabold text-slate-900 dark:text-white">Preisrechner</div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <select className="rounded-xl border-2 border-slate-300 bg-transparent px-3 py-3 text-sm font-semibold" value={service} onChange={(e) => setService(e.target.value as ServiceType)}>
          <option value="UMZUG">Umzug</option>
          <option value="ENTSORGUNG">Entsorgung</option>
          <option value="KOMBI">Kombi</option>
          <option value="MONTAGE">Montage</option>
        </select>
        <select className="rounded-xl border-2 border-slate-300 bg-transparent px-3 py-3 text-sm font-semibold" value={speed} onChange={(e) => setSpeed(e.target.value as SpeedType)}>
          <option value="ECONOMY">Günstig</option>
          <option value="STANDARD">Standard</option>
          <option value="EXPRESS">Express</option>
        </select>
      </div>

      {!isMontage ? (
        <div className="mt-4">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Volumen (m³)</label>
          <Input type="number" min={1} max={200} value={volumeM3} onChange={(e) => setVolumeM3(Math.max(1, Math.min(200, Number(e.target.value) || 1)))} />
        </div>
      ) : null}

      <div className={`mt-4 grid gap-3 ${isMontage ? "" : "sm:grid-cols-2"}`}>
        <Input placeholder={isMontage ? "Einsatzadresse (optional)" : "Von (PLZ + Straße)"} value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} />
        {!isMontage ? <Input placeholder="Nach (PLZ + Straße)" value={toAddress} onChange={(e) => setToAddress(e.target.value)} /> : null}
      </div>

      {isMontage ? (
        <div className="mt-4 grid gap-2">
          {montageOptions.map((opt) => {
            const qty = selectedServiceOptions[opt.code] ?? 0;
            return (
              <div key={opt.code} className="flex items-center justify-between rounded-xl border border-slate-300 p-3">
                <div>
                  <div className="text-sm font-bold">{opt.nameDe}</div>
                  <div className="text-xs text-slate-500">ab {Math.max(1, Math.round(opt.defaultPriceCents / 100))} €</div>
                </div>
                {opt.requiresQuantity ? (
                  <Input className="w-20" type="number" min={0} max={50} value={qty} onChange={(e) => setSelectedServiceOptions((prev) => ({ ...prev, [opt.code]: Math.max(0, Math.min(50, Number(e.target.value) || 0)) }))} />
                ) : (
                  <input type="checkbox" checked={qty > 0} onChange={(e) => setSelectedServiceOptions((prev) => (e.target.checked ? { ...prev, [opt.code]: 1 } : Object.fromEntries(Object.entries(prev).filter(([key]) => key !== opt.code))))} />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Input type="number" min={0} max={10} value={floors} onChange={(e) => setFloors(Math.max(0, Math.min(10, Number(e.target.value) || 0)))} placeholder="Etagen" />
          <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"><input type="checkbox" checked={hasElevator} onChange={(e) => setHasElevator(e.target.checked)} /> Aufzug</label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"><input type="checkbox" checked={needNoParkingZone} onChange={(e) => setNeedNoParkingZone(e.target.checked)} /> Halteverbotszone</label>
        </div>
      )}

      {showRouteHint ? <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Für genaue Fahrtkosten bitte beide Adressen angeben.</div> : null}
      {calcError ? <div className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{calcError}</div> : null}

      <div className="mt-5 rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm">
        <div className="flex justify-between"><span>Leistung</span><span className="font-bold">{serviceLabels[service]}</span></div>
        {!isMontage ? <div className="flex justify-between"><span>Volumen</span><span className="font-bold">{formatNumberDE(volumeM3)} m³</span></div> : null}
        <div className="mt-2 flex justify-between text-lg font-extrabold"><span>Preisrahmen</span><span>{eur(estimate.breakdown.minCents)} - {eur(estimate.breakdown.maxCents)}</span></div>
        <div className="text-xs text-slate-500">Richtpreis: Endpreis nach Angebot.</div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          className="flex-1 gap-2"
          onClick={() => {
            if (service === "UMZUG" || service === "KOMBI") {
              if (!fromAddress.trim() || !toAddress.trim()) {
                setCalcError("Bitte Start- und Zieladresse ergänzen.");
                return;
              }
            }
            sessionStorage.setItem(
              INQUIRY_STORAGE_KEY,
              JSON.stringify({ service, speed, volumeM3, fromAddress, toAddress, selectedServiceOptions, estimate }),
            );
            const params = new URLSearchParams();
            params.set("speed", speed);
            if (service === "MONTAGE") {
              params.set("context", "MONTAGE");
              const options = Object.entries(selectedServiceOptions)
                .filter(([, qty]) => qty > 0)
                .map(([code, qty]) => `${code}:${qty}`)
                .join(",");
              if (options) params.set("options", options);
            } else if (service === "ENTSORGUNG") {
              params.set("context", "ENTSORGUNG");
            } else if (service === "KOMBI") {
              params.set("service", "BOTH");
            } else {
              params.set("context", "MOVING");
            }
            router.push(`/buchen?${params.toString()}`);
          }}
        >
          <CalendarDays className="h-5 w-5" />
          Termin auswählen
          <ArrowRight className="h-4 w-4" />
        </Button>
        <a href="tel:+491729573681" className="sm:w-auto">
          <Button size="lg" variant="outline">+49 172 9573681</Button>
        </a>
      </div>
    </div>
  );
}


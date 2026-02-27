"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Calculator, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumberDE } from "@/lib/format-number";

type ServiceKind = "UMZUG" | "MONTAGE" | "ENTSORGUNG" | "SPECIAL";
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

type ApiPackage = {
  tier: SpeedType;
  minCents: number;
  maxCents: number;
  netCents: number;
  vatCents: number;
  grossCents: number;
};

type ApiResponse = {
  serviceCart: Array<{ kind: ServiceKind; qty: number; moduleSlug?: "MONTAGE" | "ENTSORGUNG" | "SPECIAL"; titleDe?: string }>;
  servicesBreakdown: Array<{ kind: ServiceKind; title: string; subtotalCents: number; minCents: number; maxCents: number; optionTotalCents: number; optionCount: number }>;
  packages: ApiPackage[];
  totals: ApiPackage;
  priceNet: number;
  vat: number;
  priceGross: number;
  breakdown: Record<string, unknown>;
};

type QuoteSnapshotResponse = {
  snapshot: {
    quoteId: string;
    draft: {
      serviceContext: "MOVING" | "MONTAGE" | "ENTSORGUNG" | "SPEZIALSERVICE" | "COMBO";
      packageSpeed: SpeedType;
      volumeM3: number;
      floors: number;
      hasElevator: boolean;
      needNoParkingZone: boolean;
      fromAddress?: { displayName: string };
      toAddress?: { displayName: string };
      selectedServiceOptions: Array<{ code: string; qty: number }>;
      extras: {
        packing: boolean;
        stairs: boolean;
        express: boolean;
        noParkingZone: boolean;
        disposalBags: boolean;
      };
    };
  };
};

type QuoteApiErrorResponse = {
  quoteId?: string;
  error?: string;
  details?: {
    fieldErrors?: Record<string, string[] | undefined>;
  };
};

const serviceLabels: Record<ServiceKind, string> = {
  UMZUG: "Umzug",
  MONTAGE: "Montage",
  ENTSORGUNG: "Entsorgung",
  SPECIAL: "Spezialservice",
};

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

function deriveLegacyServiceType(services: ServiceKind[]) {
  const hasMoving = services.includes("UMZUG");
  const hasDisposal = services.includes("ENTSORGUNG");
  if (hasMoving && hasDisposal) return "KOMBI" as const;
  if (services.length === 1 && services[0] === "MONTAGE") return "MONTAGE" as const;
  if (services.length === 1 && services[0] === "SPECIAL") return "SPECIAL" as const;
  if (hasDisposal && !hasMoving) return "ENTSORGUNG" as const;
  return "UMZUG" as const;
}

function contextFromServices(services: ServiceKind[]) {
  if (services.length === 1 && services[0] === "MONTAGE") return "MONTAGE";
  if (services.length === 1 && services[0] === "ENTSORGUNG") return "ENTSORGUNG";
  if (services.length === 1 && services[0] === "SPECIAL") return "SPECIAL";
  return "STANDARD";
}

export function PriceCalculator({
  montageOptions = [],
  externalVolumeM3,
}: {
  pricing?: PricingData | null;
  montageOptions?: MontageCalculatorOption[];
  externalVolumeM3?: number;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [selectedServices, setSelectedServices] = useState<ServiceKind[]>(() => {
    const serviceParam = (sp.get("service") || "").toUpperCase();
    if (serviceParam === "MONTAGE") return ["MONTAGE"];
    if (serviceParam === "ENTSORGUNG") return ["ENTSORGUNG"];
    if (serviceParam === "KOMBI") return ["UMZUG", "ENTSORGUNG"];
    if (serviceParam === "SPECIAL") return ["SPECIAL"];
    return ["UMZUG"];
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
  const [selectedServiceOptions, setSelectedServiceOptions] = useState<Record<string, number>>(
    () => parseOptions(sp.get("options")),
  );

  const [calcError, setCalcError] = useState<string | null>(null);
  const [server, setServer] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [handoffLoading, setHandoffLoading] = useState(false);

  const hasMoving = selectedServices.includes("UMZUG");
  const hasMontageLike = selectedServices.includes("MONTAGE") || selectedServices.includes("SPECIAL");
  const serviceCart = useMemo(
    () =>
      selectedServices.map((kind) => ({
        kind,
        qty: 1,
        moduleSlug:
          kind === "MONTAGE" ? ("MONTAGE" as const) : kind === "ENTSORGUNG" ? ("ENTSORGUNG" as const) : kind === "SPECIAL" ? ("SPECIAL" as const) : undefined,
        titleDe: serviceLabels[kind],
      })),
    [selectedServices],
  );

  const serviceType = useMemo(() => deriveLegacyServiceType(selectedServices), [selectedServices]);

  useEffect(() => {
    if (externalVolumeM3 && externalVolumeM3 >= 1 && externalVolumeM3 <= 200) setVolumeM3(externalVolumeM3);
  }, [externalVolumeM3]);

  function toggleService(kind: ServiceKind) {
    setSelectedServices((prev) => {
      if (prev.includes(kind)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== kind);
      }
      return [...prev, kind];
    });
  }

  useEffect(() => {
    let cancel = false;
    const timer = window.setTimeout(async () => {
      try {
        const handoffTargetAddress = hasMoving ? toAddress.trim() : fromAddress.trim();
        setLoading(true);
        const res = await fetch("/api/price/calc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceType,
            serviceCart,
            speed,
            volumeM3,
            floors,
            hasElevator,
            needNoParkingZone,
            selectedServiceOptions: Object.entries(selectedServiceOptions).map(([code, qty]) => ({
              code,
              qty,
            })),
            fromAddress: fromAddress.trim() || undefined,
            toAddress: handoffTargetAddress || undefined,
          }),
        });

        const json = (await res.json()) as ApiResponse | { error?: string };
        if (!res.ok) throw new Error(("error" in json && json.error) || "Preisberechnung fehlgeschlagen.");
        if (!cancel) {
          setServer(json as ApiResponse);
          setCalcError(null);
        }
      } catch (error) {
        if (!cancel) {
          setServer(null);
          setCalcError(error instanceof Error ? error.message : "Preisberechnung fehlgeschlagen.");
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    }, 300);

    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [
    serviceType,
    serviceCart,
    hasMoving,
    speed,
    volumeM3,
    floors,
    hasElevator,
    needNoParkingZone,
    selectedServiceOptions,
    fromAddress,
    toAddress,
  ]);

  const showRouteHint = hasMoving && (!fromAddress.trim() || !toAddress.trim());

  useEffect(() => {
    const quoteId = sp.get("quoteId");
    if (!quoteId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as QuoteSnapshotResponse;
        const draft = json.snapshot?.draft;
        if (!draft || cancelled) return;

        const contextServices: Record<QuoteSnapshotResponse["snapshot"]["draft"]["serviceContext"], ServiceKind[]> = {
          MOVING: ["UMZUG"],
          MONTAGE: ["MONTAGE"],
          ENTSORGUNG: ["ENTSORGUNG"],
          SPEZIALSERVICE: ["SPECIAL"],
          COMBO: ["UMZUG", "ENTSORGUNG"],
        };
        setSelectedServices(contextServices[draft.serviceContext] ?? ["UMZUG"]);
        setSpeed(draft.packageSpeed);
        setVolumeM3(draft.volumeM3);
        setFloors(draft.floors);
        setHasElevator(draft.hasElevator);
        setNeedNoParkingZone(draft.needNoParkingZone);
        setFromAddress(draft.fromAddress?.displayName ?? "");
        setToAddress(draft.toAddress?.displayName ?? "");
        setSelectedServiceOptions(
          Object.fromEntries((draft.selectedServiceOptions ?? []).map((item) => [item.code, item.qty])),
        );
      } catch {
        // Intentionally silent: quote restore is best-effort on calculator page.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sp]);

  return (
    <div className="rounded-3xl border-2 border-slate-300 bg-[color:var(--surface-elevated)] p-6 shadow-lg sm:p-8 dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
          <Calculator className="h-5 w-5" />
        </div>
        <div className="text-lg font-extrabold text-slate-900 dark:text-white">Preisrechner</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {(["UMZUG", "MONTAGE", "ENTSORGUNG", "SPECIAL"] as const).map((kind) => {
          const active = selectedServices.includes(kind);
          return (
            <button
              key={kind}
              type="button"
              onClick={() => toggleService(kind)}
              className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-bold transition ${
                active
                  ? "border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-200"
                  : "border-slate-300 bg-white/60 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
              }`}
            >
              {serviceLabels[kind]}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <select
          className="rounded-xl border-2 border-slate-300 bg-transparent px-3 py-3 text-sm font-semibold dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          value={speed}
          onChange={(e) => setSpeed(e.target.value as SpeedType)}
        >
          <option value="ECONOMY">Economy</option>
          <option value="STANDARD">Standard</option>
          <option value="EXPRESS">Express</option>
        </select>
        <Input
          type="number"
          min={1}
          max={200}
          value={volumeM3}
          onChange={(e) => setVolumeM3(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
          placeholder="Volumen (m³)"
        />
      </div>

      <div className={`mt-4 grid gap-3 ${hasMoving ? "sm:grid-cols-2" : ""}`}>
        <Input
          placeholder={hasMoving ? "Von (PLZ + Straße)" : "Einsatzadresse (optional)"}
          value={fromAddress}
          onChange={(e) => setFromAddress(e.target.value)}
        />
        {hasMoving ? (
          <Input
            placeholder="Nach (PLZ + Straße)"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
          />
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Input
          type="number"
          min={0}
          max={10}
          value={floors}
          onChange={(e) => setFloors(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
          placeholder="Etagen"
        />
        <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:text-slate-200">
          <input type="checkbox" checked={hasElevator} onChange={(e) => setHasElevator(e.target.checked)} /> Aufzug
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:text-slate-200">
          <input
            type="checkbox"
            checked={needNoParkingZone}
            onChange={(e) => setNeedNoParkingZone(e.target.checked)}
          />{" "}
          Halteverbotszone
        </label>
      </div>

      {hasMontageLike ? (
        <div className="mt-4 grid gap-2">
          {montageOptions.map((opt) => {
            const qty = selectedServiceOptions[opt.code] ?? 0;
            return (
              <div
                key={opt.code}
                className="flex items-center justify-between rounded-xl border border-slate-300 p-3 dark:border-slate-600"
              >
                <div>
                  <div className="text-sm font-bold">{opt.nameDe}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    ab {Math.max(1, Math.round(opt.defaultPriceCents / 100))} €
                  </div>
                </div>
                {opt.requiresQuantity ? (
                  <Input
                    className="w-20"
                    type="number"
                    min={0}
                    max={50}
                    value={qty}
                    onChange={(e) =>
                      setSelectedServiceOptions((prev) => ({
                        ...prev,
                        [opt.code]: Math.max(0, Math.min(50, Number(e.target.value) || 0)),
                      }))
                    }
                  />
                ) : (
                  <input
                    type="checkbox"
                    checked={qty > 0}
                    onChange={(e) =>
                      setSelectedServiceOptions((prev) =>
                        e.target.checked
                          ? { ...prev, [opt.code]: 1 }
                          : Object.fromEntries(Object.entries(prev).filter(([code]) => code !== opt.code)),
                      )
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {showRouteHint ? (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200">
          Für genaue Fahrtkosten bitte beide Adressen angeben.
        </div>
      ) : null}
      {calcError ? (
        <div className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 dark:border-red-600 dark:bg-red-900/30 dark:text-red-200">
          {calcError}
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>Leistungen</span>
          <span className="text-right font-bold">{selectedServices.map((kind) => serviceLabels[kind]).join(" + ")}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <span>Umfang</span>
          <span className="text-right font-bold">{formatNumberDE(volumeM3)} m³</span>
        </div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Richtpreis: Endpreis nach Angebot.
        </div>
      </div>

      {loading && !server?.packages?.length ? (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="animate-pulse rounded-2xl border border-slate-300 p-3 dark:border-slate-700">
              <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-2 h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-1 h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      ) : server?.packages?.length ? (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {server.packages.map((pkg) => (
            <div key={pkg.tier} className="min-w-0 overflow-hidden rounded-2xl border border-slate-300 p-3 dark:border-slate-700">
              <div className="truncate text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {pkg.tier}
              </div>
              <div className="mt-1 truncate text-sm font-extrabold text-slate-900 dark:text-white">
                {eur(pkg.minCents)} - {eur(pkg.maxCents)}
              </div>
              <div className="truncate text-xs text-slate-500 dark:text-slate-400">inkl. MwSt.</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button
          size="lg"
          className="flex-1 gap-2"
          onClick={async () => {
            if (hasMoving && (!fromAddress.trim() || !toAddress.trim())) {
              setCalcError("Bitte Start- und Zieladresse ergänzen.");
              return;
            }
            if (!hasMoving && !fromAddress.trim()) {
              setCalcError("Bitte geben Sie die Einsatzadresse vollständig ein.");
              return;
            }
            setHandoffLoading(true);
            setCalcError(null);

            const params = new URLSearchParams();
            params.set("speed", speed);
            const context = contextFromServices(selectedServices);
            params.set("context", context);
            if (serviceType === "KOMBI") params.set("service", "BOTH");

            const options = Object.entries(selectedServiceOptions)
              .filter(([, qty]) => qty > 0)
              .map(([code, qty]) => `${code}:${qty}`)
              .join(",");
            if (options) params.set("options", options);
            try {
              const context = contextFromServices(selectedServices);
              const contextMap: Record<string, "MOVING" | "MONTAGE" | "ENTSORGUNG" | "SPEZIALSERVICE" | "COMBO"> = {
                STANDARD: "MOVING",
                MONTAGE: "MONTAGE",
                ENTSORGUNG: "ENTSORGUNG",
                SPECIAL: "SPEZIALSERVICE",
              };
              const serviceContext =
                serviceType === "KOMBI" ? "COMBO" : (contextMap[context] ?? "MOVING");
              const normalizedFromAddress = fromAddress.trim();
              const normalizedToAddress = hasMoving ? toAddress.trim() : normalizedFromAddress;
              const fromPostalCode = normalizedFromAddress.match(/\b\d{5}\b/)?.[0];
              const toPostalCode = normalizedToAddress.match(/\b\d{5}\b/)?.[0];
              if ((serviceContext === "MOVING" || serviceContext === "COMBO") && (!fromPostalCode || !toPostalCode)) {
                throw new Error("Bitte geben Sie in beiden Adressen eine gültige PLZ an.");
              }
              if (
                (serviceContext === "MONTAGE" || serviceContext === "ENTSORGUNG" || serviceContext === "SPEZIALSERVICE") &&
                normalizedToAddress &&
                !toPostalCode
              ) {
                throw new Error("Bitte geben Sie in der Einsatzadresse eine gültige PLZ an.");
              }

              const quoteRes = await fetch("/api/quotes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  draft: {
                    serviceContext,
                    packageSpeed: speed,
                    volumeM3,
                    floors,
                    hasElevator,
                    needNoParkingZone,
                    fromAddress: normalizedFromAddress
                      ? {
                          displayName: normalizedFromAddress,
                          postalCode: fromPostalCode || "",
                          city: "Berlin",
                          street: normalizedFromAddress,
                        }
                      : undefined,
                    toAddress: normalizedToAddress
                      ? {
                          displayName: normalizedToAddress,
                          postalCode: toPostalCode || "",
                          city: "Berlin",
                          street: normalizedToAddress,
                        }
                      : undefined,
                    selectedServiceOptions: Object.entries(selectedServiceOptions)
                      .filter(([, qty]) => qty > 0)
                      .map(([code, qty]) => ({ code, qty })),
                    extras: {
                      packing: false,
                      stairs: floors > 0 && !hasElevator,
                      express: speed === "EXPRESS",
                      noParkingZone: needNoParkingZone,
                      disposalBags: false,
                    },
                  },
                }),
              });
              const quoteJson = (await quoteRes.json()) as QuoteApiErrorResponse;
              if (!quoteRes.ok || !quoteJson.quoteId) {
                const fromAddressError = quoteJson.details?.fieldErrors?.fromAddress?.[0];
                const toAddressError = quoteJson.details?.fieldErrors?.toAddress?.[0];
                throw new Error(
                  fromAddressError ||
                    toAddressError ||
                    quoteJson.error ||
                    "Angebot konnte nicht übernommen werden.",
                );
              }
              params.set("quoteId", quoteJson.quoteId);
              router.push(`/booking?${params.toString()}`);
            } catch (error) {
              setCalcError(error instanceof Error ? error.message : "Angebot konnte nicht übernommen werden.");
            } finally {
              setHandoffLoading(false);
            }
          }}
          disabled={loading || handoffLoading}
        >
          <CalendarDays className="h-5 w-5" />
          {handoffLoading ? "Angebot wird übernommen..." : "Jetzt buchen"}
          <ArrowRight className="h-4 w-4" />
        </Button>
        <a href="tel:+491729573681" className="w-full sm:w-auto">
          <Button size="lg" variant="outline" className="w-full sm:w-auto">
            +49 172 9573681
          </Button>
        </a>
      </div>
    </div>
  );
}




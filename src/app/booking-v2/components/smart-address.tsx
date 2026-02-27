"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";

import { cn } from "@/components/ui/cn";
import { AddressAutocompleteInput } from "@/components/address/address-autocomplete-input";
import type { BookingService } from "@/app/booking-v2/lib/pricing";
import type { AddressOption } from "@/app/booking-v2/components/types";
import styles from "@/app/booking-v2/booking-v2.module.css";

function AddressInput(props: {
  label: string;
  value?: AddressOption;
  onChange: (next?: AddressOption) => void;
  required?: boolean;
}) {
  return (
    <AddressAutocompleteInput
      label={props.label}
      value={props.value?.displayName ?? ""}
      required={props.required}
      onValueChange={(value) => {
        const postalCode = value.match(/\b\d{5}\b/)?.[0] ?? "";
        props.onChange(
          value.trim()
            ? {
                displayName: value,
                postalCode,
                city: "Berlin",
                street: value,
              }
            : undefined,
        );
      }}
      onSelect={(next) => props.onChange(next as AddressOption | undefined)}
      placeholder="Straße, Hausnummer, PLZ, Ort"
    />
  );
}

export function SmartAddressSection(props: {
  service: BookingService;
  from?: AddressOption;
  to?: AddressOption;
  onFromChange: (next?: AddressOption) => void;
  onToChange: (next?: AddressOption) => void;
  distanceKm?: number;
  distanceSource?: "approx" | "ors" | "cache" | "fallback";
  loading?: boolean;
  error?: string | null;
}) {
  const [geoLoading, setGeoLoading] = useState(false);
  const needsTwoAddresses = props.service === "MOVING" || props.service === "COMBO";

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">2. Adressen</h2>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Start- und Zieladresse werden geocodiert. Die Distanz wird über die Routing-API berechnet.
        </p>
      </div>

      <div className="grid gap-4">
        {needsTwoAddresses ? (
          <>
            <AddressInput label="Startadresse" value={props.from} onChange={props.onFromChange} required />
            <AddressInput label="Zieladresse" value={props.to} onChange={props.onToChange} required />
          </>
        ) : (
          <AddressInput
            label={props.service === "ASSEMBLY" ? "Einsatzadresse" : "Abholadresse"}
            value={props.to}
            onChange={props.onToChange}
            required
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (!navigator.geolocation) return;
            setGeoLoading(true);
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const candidate: AddressOption = {
                  displayName: `Aktueller Standort (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`,
                  city: "Standort",
                  postalCode: "00000",
                  lat: position.coords.latitude,
                  lon: position.coords.longitude,
                };
                if (needsTwoAddresses) props.onFromChange(candidate);
                else props.onToChange(candidate);
                setGeoLoading(false);
              },
              () => setGeoLoading(false),
            );
          }}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-700 transition hover:bg-cyan-500/20 dark:text-cyan-200",
            styles.glowButton,
          )}
        >
          <LocateFixed className="h-3.5 w-3.5" />
          {geoLoading ? "Standort wird ermittelt..." : "Aktuellen Standort verwenden"}
        </button>
        <span className="rounded-xl border border-slate-300/70 bg-white/60 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
          Distanz: {props.distanceKm && props.distanceKm > 0 ? `${props.distanceKm.toFixed(1)} km` : "wird berechnet"}
          {props.distanceSource ? ` · Quelle: ${props.distanceSource}` : ""}
        </span>
      </div>

      {props.error ? (
        <div className="rounded-xl border border-amber-300/80 bg-amber-100/70 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-400/50 dark:bg-amber-900/20 dark:text-amber-200">
          {props.error}
        </div>
      ) : null}

      <div className={cn(styles.mapPreview, "p-4")}>
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Routing-Status</div>
        <div className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          {props.loading
            ? "Route wird berechnet..."
            : needsTwoAddresses
              ? "Route zwischen Start- und Zieladresse"
              : "Anfahrt zum Einsatzort"}
        </div>
        <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
          Die exakte Distanz fließt in Preis und Zeitschätzung ein.
        </div>
      </div>
    </section>
  );
}




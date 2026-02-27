"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LocateFixed, MapPin } from "lucide-react";

import { cn } from "@/components/ui/cn";
import type { BookingService } from "@/app/booking-v2/lib/pricing";
import type { AddressOption } from "@/app/booking-v2/components/types";
import styles from "@/app/booking-v2/booking-v2.module.css";

type GeocodeResponse = { results: AddressOption[] };

function AddressInput(props: {
  label: string;
  value?: AddressOption;
  onChange: (next?: AddressOption) => void;
  required?: boolean;
}) {
  const [query, setQuery] = useState(props.value?.displayName ?? "");
  const [results, setResults] = useState<AddressOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(props.value?.displayName ?? "");
  }, [props.value?.displayName]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&limit=5`);
        if (!res.ok) return;
        const data = (await res.json()) as GeocodeResponse;
        setResults(data.results ?? []);
      } finally {
        setLoading(false);
      }
    }, 260);
    return () => clearTimeout(id);
  }, [query]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-800 dark:text-slate-100">
        {props.label} {props.required ? "*" : ""}
      </label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            props.onChange(undefined);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-xl border border-slate-300/80 bg-white/60 py-3 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900/55 dark:text-slate-100"
          placeholder="Straße, Hausnummer, PLZ, Ort"
        />
        <AnimatePresence>
          {open && (results.length > 0 || loading) ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-slate-300/80 bg-white/95 p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900/95"
            >
              {loading ? <div className="px-3 py-2 text-xs font-semibold text-slate-500">Suche läuft...</div> : null}
              {results.map((r) => (
                <button
                  key={`${r.lat}-${r.lon}-${r.displayName}`}
                  type="button"
                  onClick={() => {
                    props.onChange(r);
                    setQuery(r.displayName);
                    setOpen(false);
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-cyan-50 dark:text-slate-100 dark:hover:bg-cyan-900/30"
                >
                  {r.displayName}
                </button>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function haversineKm(from: AddressOption, to: AddressOption) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const depot: AddressOption = {
  displayName: "Betriebspunkt Berlin",
  postalCode: "12043",
  city: "Berlin",
  lat: 52.48,
  lon: 13.43,
};

export function SmartAddressSection(props: {
  service: BookingService;
  from?: AddressOption;
  to?: AddressOption;
  onFromChange: (next?: AddressOption) => void;
  onToChange: (next?: AddressOption) => void;
  onDistanceChange: (km: number) => void;
}) {
  const [geoLoading, setGeoLoading] = useState(false);

  const distanceKm = useMemo(() => {
    if (props.service === "MOVING" || props.service === "COMBO") {
      if (!props.from || !props.to) return 0;
      return haversineKm(props.from, props.to);
    }
    const target = props.to ?? props.from;
    if (!target) return 0;
    return haversineKm(depot, target);
  }, [props.from, props.service, props.to]);

  useEffect(() => {
    props.onDistanceChange(Number(distanceKm.toFixed(1)));
  }, [distanceKm, props]);

  const needsTwoAddresses = props.service === "MOVING" || props.service === "COMBO";

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">2. Smart-Adresse</h2>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Adresse wird automatisch erkannt. Distanz wird live berechnet.
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
                  postalCode: "",
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
          Distanz: {distanceKm > 0 ? `${distanceKm.toFixed(1)} km` : "wird nach Adresseingabe berechnet"}
        </span>
      </div>

      <div className={cn(styles.mapPreview, "p-4")}>
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700 dark:text-slate-300">Kartenvorschau</div>
        <div className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          {needsTwoAddresses
            ? "Route zwischen Start- und Zieladresse."
            : "Anfahrt vom Betriebspunkt zur Einsatzadresse."}
        </div>
        <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
          Die Karte wird beim finalen Auftrag mit exakter Route ergänzt.
        </div>
      </div>
    </section>
  );
}


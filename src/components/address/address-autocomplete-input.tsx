"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

import { cn } from "@/components/ui/cn";

export type AddressAutocompleteOption = {
  displayName: string;
  postalCode: string;
  city: string;
  state?: string;
  street?: string;
  houseNumber?: string;
  lat: number;
  lon: number;
};

type GeocodeResponse = { results: AddressAutocompleteOption[] };

export function AddressAutocompleteInput(props: {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  onSelect?: (address?: AddressAutocompleteOption) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  limit?: number;
}) {
  const [results, setResults] = useState<AddressAutocompleteOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = props.value.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }

    const id = window.setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&limit=${props.limit ?? 5}`);
        if (!res.ok) return;
        const data = (await res.json()) as GeocodeResponse;
        setResults(data.results ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(id);
  }, [props.value, props.limit]);

  return (
    <div className={cn("space-y-2", props.className)}>
      {props.label ? (
        <label className="text-sm font-bold text-slate-800 dark:text-slate-100">
          {props.label} {props.required ? "*" : ""}
        </label>
      ) : null}
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
        <input
          value={props.value}
          onChange={(e) => {
            props.onValueChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          disabled={props.disabled}
          className={cn(
            "w-full rounded-xl border border-slate-300/80 bg-white/60 py-3 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900/55 dark:text-slate-100",
            props.inputClassName,
          )}
          placeholder={props.placeholder ?? "Straße, Hausnummer, PLZ, Ort"}
          aria-label={props.label ?? "Adresse"}
        />
        {open && (results.length > 0 || loading) ? (
          <div className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-slate-300/80 bg-white/95 p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900/95">
            {loading ? (
              <div className="px-3 py-2 text-xs font-semibold text-slate-500">Adressen werden geladen...</div>
            ) : null}
            {results.map((r) => (
              <button
                key={`${r.lat}-${r.lon}-${r.displayName}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  props.onValueChange(r.displayName);
                  props.onSelect?.(r);
                  setOpen(false);
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-cyan-50 dark:text-slate-100 dark:hover:bg-cyan-900/30"
              >
                {r.displayName}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/components/ui/cn";

export type AddressOption = {
  displayName: string;
  postalCode: string;
  city: string;
  state?: string;
  street?: string;
  houseNumber?: string;
  lat: number;
  lon: number;
};

export function AddressAutocomplete(props: {
  label: string;
  placeholder?: string;
  value?: AddressOption;
  onChange: (v?: AddressOption) => void;
  required?: boolean;
}) {
  const [q, setQ] = useState(props.value?.displayName ?? "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AddressOption[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const trimmed = q.trim();
  const canSearch = trimmed.length >= 3;

  useEffect(() => {
    setQ(props.value?.displayName ?? "");
  }, [props.value?.displayName]);

  useEffect(() => {
    if (!open) return;
    if (!canSearch) {
      setResults([]);
      return;
    }

    setLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}&limit=6`, {
          signal: ac.signal,
        });
        if (!res.ok) throw new Error("geocode failed");
        const json = (await res.json()) as { results: AddressOption[] };
        setResults(json.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [trimmed, canSearch, open]);

  const helper = useMemo(() => {
    if (!open) return "";
    if (!canSearch) return "Mindestens 3 Zeichen eingeben.";
    if (loading) return "Suche…";
    if (results.length === 0) return "Keine Treffer.";
    return "";
  }, [open, canSearch, loading, results.length]);

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-extrabold text-slate-900">
          {props.label} {props.required ? <span className="text-brand-700">*</span> : null}
        </label>
        {props.value ? (
          <button
            type="button"
            onClick={() => props.onChange(undefined)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
            Löschen
          </button>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="pointer-events-none absolute left-3 top-[46px] text-slate-500">
          <MapPin className="h-4 w-4" />
        </div>
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={props.placeholder ?? "Straße, Hausnummer, PLZ, Ort"}
          className="pl-9"
        />
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
      </div>

      {open ? (
        <div
          className={cn(
            "absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border-2 border-slate-300 bg-[color:var(--surface-elevated)] shadow-lg",
          )}
        >
          {helper ? (
            <div className="px-4 py-3 text-sm font-semibold text-slate-700">{helper}</div>
          ) : null}

          {results.length ? (
            <ul className="max-h-80 overflow-auto py-1">
              {results.map((r) => (
                <li key={`${r.lat}-${r.lon}-${r.postalCode}`}>
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                    onClick={() => {
                      props.onChange(r);
                      setQ(r.displayName);
                      setOpen(false);
                    }}
                  >
                    <div className="line-clamp-2">{r.displayName}</div>
                    <div className="mt-1 text-xs font-bold text-slate-600">
                      {r.postalCode} {r.city}
                      {r.state ? `  ${r.state}` : ""}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="border-t-2 border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700">
            Adress-Suche via OpenStreetMap (Nominatim). In seltenen Fällen bitte PLZ/Ort prüfen.
          </div>
        </div>
      ) : null}
    </div>
  );
}





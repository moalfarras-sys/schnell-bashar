"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [resolvingManual, setResolvingManual] = useState(false);
  const [manualError, setManualError] = useState("");
  const [results, setResults] = useState<AddressOption[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const trimmed = q.trim();
  const canSearch = trimmed.length >= 3;

  useEffect(() => {
    setQ(props.value?.displayName ?? "");
  }, [props.value?.displayName]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

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
    if (manualError) return manualError;
    if (!open) return "";
    if (!canSearch) return "Mindestens 3 Zeichen eingeben.";
    if (loading || resolvingManual) return "Suche...";
    if (results.length === 0) return "Keine Treffer.";
    return "";
  }, [manualError, open, canSearch, loading, resolvingManual, results.length]);

  const resolveFreeTextAddress = useCallback(async () => {
    const typed = q.trim();
    if (typed.length < 3) return;

    const selected = props.value?.displayName?.trim();
    if (selected && selected.toLowerCase() === typed.toLowerCase()) return;

    setResolvingManual(true);
    setManualError("");

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(typed)}&limit=1`);
      if (!res.ok) throw new Error("geocode failed");
      const json = (await res.json()) as { results?: AddressOption[] };
      const first = json.results?.[0];
      if (!first) {
        props.onChange(undefined);
        setManualError("Adresse konnte nicht eindeutig gefunden werden. Bitte Vorschlag ausw\u00e4hlen.");
        return;
      }

      props.onChange(first);
      setQ(first.displayName);
      setOpen(false);
    } catch {
      setManualError("Adresse konnte nicht aufgel\u00f6st werden. Bitte Vorschlag ausw\u00e4hlen.");
    } finally {
      setResolvingManual(false);
    }
  }, [props, q]);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-extrabold text-slate-900 dark:text-white">
          {props.label} {props.required ? <span className="text-brand-700 dark:text-brand-400">*</span> : null}
        </label>
        {props.value ? (
          <button
            type="button"
            onClick={() => props.onChange(undefined)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
            {"L\u00f6schen"}
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
            const next = e.target.value;
            setQ(next);
            setManualError("");
            if (props.value && next.trim().toLowerCase() !== props.value.displayName.trim().toLowerCase()) {
              props.onChange(undefined);
            }
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => {
              void resolveFreeTextAddress();
            }, 120);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (results[0]) {
                props.onChange(results[0]);
                setQ(results[0].displayName);
                setOpen(false);
                return;
              }
              void resolveFreeTextAddress();
            }
          }}
          placeholder={props.placeholder ?? "Stra\u00dfe, Hausnummer, PLZ, Ort"}
          className="pl-9"
        />
        {loading || resolvingManual ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        ) : null}
      </div>

      {open ? (
        <div
          className={cn(
            "absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border-2 border-slate-300 bg-[color:var(--surface-elevated)] shadow-lg",
          )}
        >
          {helper ? (
            <div className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{helper}</div>
          ) : null}

          {results.length ? (
            <ul className="max-h-80 overflow-auto py-1">
              {results.map((r) => (
                <li key={`${r.lat}-${r.lon}-${r.postalCode}`}>
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
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

          <div className="border-t-2 border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {"Adress-Suche via OpenStreetMap (Nominatim). In seltenen F\u00e4llen bitte PLZ/Ort pr\u00fcfen."}
          </div>
        </div>
      ) : null}
    </div>
  );
}

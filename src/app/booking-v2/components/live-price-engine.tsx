"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock4, Gauge, Sparkles, Wallet } from "lucide-react";

import { formatEuroFromCents, type PriceCalcResponse } from "@/app/booking-v2/lib/pricing";
import styles from "@/app/booking-v2/booking-v2.module.css";

function AnimatedCurrency(props: { valueCents: number }) {
  const [shown, setShown] = useState(props.valueCents);

  useEffect(() => {
    const from = shown;
    const to = props.valueCents;
    const start = performance.now();
    const duration = 420;
    let frame = 0;

    const step = (time: number) => {
      const t = Math.min(1, (time - start) / duration);
      const ease = 1 - (1 - t) ** 3;
      setShown(Math.round(from + (to - from) * ease));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.valueCents]);

  return <>{formatEuroFromCents(shown)}</>;
}

export function LivePriceEngineCard(props: {
  calc: PriceCalcResponse | null;
  loading: boolean;
  error: string | null;
  distanceKm: number;
  volumeM3: number;
}) {
  const totals = props.calc?.totals;
  const hasEstimate = Boolean(totals);

  const rows = useMemo(() => {
    const b = props.calc?.breakdown;
    if (!props.calc?.totals || !b) return [];
    return [
      { label: "Zwischensumme", value: b.subtotalCents ?? 0, show: true },
      {
        label: "Zusatzleistungen",
        value: (b.serviceOptionsCents ?? 0) + (b.addonsCents ?? 0),
        show: ((b.serviceOptionsCents ?? 0) + (b.addonsCents ?? 0)) > 0,
      },
      { label: "Fahrtkosten", value: b.driveChargeCents ?? 0, show: (b.driveChargeCents ?? 0) > 0 },
      { label: "Rabatt", value: -(b.discountCents ?? 0), show: (b.discountCents ?? 0) > 0 },
    ].filter((row) => row.show);
  }, [props.calc?.breakdown, props.calc?.totals]);

  return (
    <aside className={`${styles.stickyCard} ${styles.glass} rounded-3xl p-6`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-200">
        <Wallet className="h-3.5 w-3.5" />
        Unverbindliche Preisorientierung
      </div>

      {totals ? (
        <>
          <motion.div
            key={totals.grossCents}
            initial={{ opacity: 0.7, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-4xl font-black text-slate-900 dark:text-white"
          >
            <AnimatedCurrency valueCents={totals.grossCents} />
          </motion.div>
          <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Bereich: {formatEuroFromCents(totals.minCents)} - {formatEuroFromCents(totals.maxCents)}
          </div>
        </>
      ) : (
        <div className="mt-3 rounded-2xl border border-slate-300/70 bg-white/55 px-4 py-3 text-sm font-medium leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-900/45 dark:text-slate-300">
          Geben Sie zunächst Adresse, Leistungsumfang und Terminwunsch an. Danach sehen Sie hier eine
          transparente Preisorientierung für Ihre Anfrage.
        </div>
      )}

      {props.loading ? (
        <div className="mt-3 rounded-xl border border-cyan-300/70 bg-cyan-100/50 px-3 py-2 text-xs font-semibold text-cyan-900 dark:border-cyan-400/50 dark:bg-cyan-900/20 dark:text-cyan-200">
          Berechnung läuft...
        </div>
      ) : null}

      {props.error ? (
        <div className="mt-3 rounded-xl border border-amber-300/70 bg-amber-100/50 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-400/50 dark:bg-amber-900/20 dark:text-amber-200">
          {props.error}
        </div>
      ) : null}

      {hasEstimate ? (
        <>
          <div className="mt-4 space-y-2">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-xl border border-slate-300/70 bg-white/55 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/45"
              >
                <span className="font-semibold text-slate-700 dark:text-slate-200">{row.label}</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatEuroFromCents(row.value)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-2">
            {props.calc?.breakdown?.laborHours != null ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-300/70 bg-white/55 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/45">
                <Clock4 className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">Geschätzte Einsatzdauer</span>
                <span className="ml-auto font-bold text-slate-900 dark:text-white">
                  {props.calc.breakdown.laborHours.toFixed(1)} Std.
                </span>
              </div>
            ) : null}
            {totals?.tier ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-300/70 bg-white/55 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/45">
                <Gauge className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">Leistungsniveau</span>
                <span className="ml-auto font-bold text-slate-900 dark:text-white">{totals.tier}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-2 rounded-xl border border-slate-300/70 bg-white/55 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/45">
              <Sparkles className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {props.distanceKm > 0 ? "Strecke & Volumen" : "Volumen"}
              </span>
              <span className="ml-auto font-bold text-slate-900 dark:text-white">
                {props.distanceKm > 0 ? `${props.distanceKm.toFixed(1)} km · ` : ""}
                {props.volumeM3} m³
              </span>
            </div>
          </div>
        </>
      ) : null}
    </aside>
  );
}


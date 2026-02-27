"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock4, Gauge, Sparkles, Wallet } from "lucide-react";

import { formatEuro, type PriceOutput } from "@/app/booking-v2/lib/pricing";
import styles from "@/app/booking-v2/booking-v2.module.css";

function AnimatedCurrency(props: { value: number }) {
  const [shown, setShown] = useState(props.value);

  useEffect(() => {
    const from = shown;
    const to = props.value;
    const start = performance.now();
    const duration = 420;
    let frame = 0;

    const step = (time: number) => {
      const t = Math.min(1, (time - start) / duration);
      const ease = 1 - (1 - t) ** 3;
      setShown(from + (to - from) * ease);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value]);

  return <>{formatEuro(shown)}</>;
}

export function LivePriceEngineCard(props: { price: PriceOutput; distanceKm: number; volumeM3: number }) {
  const rows = useMemo(
    () => [
      { label: "Basispreis", value: props.price.basePrice },
      { label: "Distanz", value: props.price.distanceCost },
      { label: "Volumen", value: props.price.volumeCost },
      { label: "Extras", value: props.price.extrasCost },
    ],
    [props.price.basePrice, props.price.distanceCost, props.price.extrasCost, props.price.volumeCost],
  );

  return (
    <aside className={`${styles.stickyCard} ${styles.glass} rounded-3xl p-6`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-200">
        <Wallet className="h-3.5 w-3.5" />
        Echtzeit-Preismotor
      </div>
      <motion.div key={props.price.totalPrice} initial={{ opacity: 0.7, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
        <AnimatedCurrency value={props.price.totalPrice} />
      </motion.div>
      <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
        Multiplikator: x{props.price.serviceMultiplier.toFixed(2)}
      </div>
      {props.price.minimumApplied ? (
        <div className="mt-2 rounded-xl border border-amber-300/70 bg-amber-100/50 px-3 py-2 text-xs font-semibold text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
          Mindestpreis wurde angewendet.
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-xl border border-slate-300/70 bg-white/55 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/45">
            <span className="font-semibold text-slate-700 dark:text-slate-200">{row.label}</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatEuro(row.value)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-slate-300/70 bg-white/55 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/45">
          <Clock4 className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">Geschätzte Dauer:</span>
          <span className="ml-auto font-bold text-slate-900 dark:text-white">{props.price.estimatedHours.toFixed(1)} Std.</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-300/70 bg-white/55 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/45">
          <Gauge className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">Leistungsstufe:</span>
          <span className="ml-auto font-bold text-slate-900 dark:text-white">{props.price.tier}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-300/70 bg-white/55 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/45">
          <Sparkles className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">Echtzeitdaten:</span>
          <span className="ml-auto font-bold text-slate-900 dark:text-white">{props.distanceKm.toFixed(1)} km · {props.volumeM3} m³</span>
        </div>
      </div>
    </aside>
  );
}

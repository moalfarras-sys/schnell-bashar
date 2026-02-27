"use client";

import { motion } from "framer-motion";
import { Boxes, Recycle, Truck, Wrench } from "lucide-react";

import { cn } from "@/components/ui/cn";
import type { BookingService } from "@/app/booking-v2/lib/pricing";

const services: Array<{
  key: BookingService;
  title: string;
  description: string;
  icon: typeof Truck;
}> = [
  {
    key: "MOVING",
    title: "Umzug",
    description: "Privat- und Firmenumzüge mit strukturierter Planung und klarer Preislogik.",
    icon: Truck,
  },
  {
    key: "DISPOSAL",
    title: "Entsorgung",
    description: "Sperrmüll, Entrümpelung und Abholung mit transparenter Aufwandsschätzung.",
    icon: Recycle,
  },
  {
    key: "ASSEMBLY",
    title: "Montage",
    description: "Möbelmontage, Demontage und Aufbauarbeiten vor Ort.",
    icon: Wrench,
  },
  {
    key: "COMBO",
    title: "Kombi-Service",
    description: "Umzug und Entsorgung in einem Einsatz für weniger Koordinationsaufwand.",
    icon: Boxes,
  },
];

export function ServiceSelection(props: { value: BookingService; onChange: (next: BookingService) => void }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">1. Serviceauswahl</h2>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Wählen Sie die passende Leistung. Die Berechnung wird sofort live aktualisiert.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {services.map((service) => {
          const Icon = service.icon;
          const active = service.key === props.value;
          return (
            <motion.button
              key={service.key}
              type="button"
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => props.onChange(service.key)}
              className={cn(
                "rounded-2xl border p-4 text-left transition-all",
                active
                  ? "border-cyan-400/70 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.4),0_10px_22px_rgba(2,132,199,0.2)]"
                  : "border-slate-300/70 bg-white/50 hover:border-cyan-300 dark:border-slate-700/80 dark:bg-slate-900/40",
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("rounded-xl p-2.5", active ? "bg-cyan-400/20" : "bg-slate-200/70 dark:bg-slate-800/80")}>
                  <Icon className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-white">{service.title}</div>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">{service.description}</p>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}



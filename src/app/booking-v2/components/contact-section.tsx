"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import styles from "@/app/booking-v2/booking-v2.module.css";
import type { ContactState, ScheduleState } from "@/app/booking-v2/components/types";

type ContactErrors = Partial<Record<keyof ContactState, string>> & {
  desiredDate?: string;
};

function FloatingInput(props: {
  label: string;
  value: string;
  type?: string;
  error?: string;
  onChange: (next: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || props.value.length > 0;

  return (
    <div className="space-y-1">
      <div className={styles.inputWrap}>
        <input
          type={props.type ?? "text"}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full rounded-xl border px-3 py-3 text-sm font-medium outline-none transition ${
            props.error
              ? "border-red-400/80 bg-red-50/70 text-red-900 dark:bg-red-900/20 dark:text-red-100"
              : "border-slate-300/80 bg-white/60 text-slate-900 focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900/55 dark:text-slate-100"
          }`}
          aria-invalid={props.error ? "true" : "false"}
        />
        <span className={`${styles.floatingLabel} ${active ? styles.floatingLabelActive : ""}`}>{props.label}</span>
      </div>
      <AnimatePresence>
        {props.error ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            className="text-xs font-semibold text-red-600 dark:text-red-300"
          >
            {props.error}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function validateContactAndSchedule(contact: ContactState, schedule: ScheduleState): ContactErrors {
  const errors: ContactErrors = {};
  if (contact.fullName.trim().length < 2) errors.fullName = "Bitte geben Sie Ihren vollständigen Namen ein.";
  if (!/^\+?[0-9\s\-()]{6,}$/.test(contact.phone.trim())) {
    errors.phone = "Bitte geben Sie eine gültige Telefonnummer ein.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
    errors.email = "Bitte geben Sie eine gültige E-Mail-Adresse ein.";
  }
  if (!schedule.desiredDate) {
    errors.desiredDate = "Bitte wählen Sie ein Wunschdatum.";
  }
  return errors;
}

export function ContactSection(props: {
  value: ContactState;
  schedule: ScheduleState;
  errors: ContactErrors;
  onChange: (next: ContactState) => void;
  onScheduleChange: (next: ScheduleState) => void;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">5. Kontakt & Termin</h2>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Wir prüfen Ihre Angaben und bestätigen den finalen Einsatztermin per E-Mail oder Telefon.
        </p>
      </div>

      <div className="grid gap-3">
        <FloatingInput
          label="Vollständiger Name"
          value={props.value.fullName}
          error={props.errors.fullName}
          onChange={(fullName) => props.onChange({ ...props.value, fullName })}
        />
        <FloatingInput
          label="Telefon"
          value={props.value.phone}
          error={props.errors.phone}
          onChange={(phone) => props.onChange({ ...props.value, phone })}
        />
        <FloatingInput
          label="E-Mail"
          type="email"
          value={props.value.email}
          error={props.errors.email}
          onChange={(email) => props.onChange({ ...props.value, email })}
        />
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-300/70 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-900/50 sm:grid-cols-3">
        <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Wunschdatum
          <input
            type="date"
            value={props.schedule.desiredDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => props.onScheduleChange({ ...props.schedule, desiredDate: e.target.value })}
            className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none transition ${
              props.errors.desiredDate
                ? "border-red-400/80 bg-red-50/70 text-red-900 dark:bg-red-900/20 dark:text-red-100"
                : "border-slate-300/80 bg-white/75 focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900/65 dark:text-slate-100"
            }`}
          />
          {props.errors.desiredDate ? (
            <span className="text-xs font-semibold text-red-600 dark:text-red-300">{props.errors.desiredDate}</span>
          ) : null}
        </label>

        <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Zeitfenster
          <select
            value={props.schedule.timeWindow}
            onChange={(e) =>
              props.onScheduleChange({
                ...props.schedule,
                timeWindow: e.target.value as ScheduleState["timeWindow"],
              })
            }
            className="w-full rounded-xl border border-slate-300/80 bg-white/75 px-3 py-2 text-sm font-semibold outline-none transition focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900/65 dark:text-slate-100"
          >
            <option value="MORNING">Vormittag</option>
            <option value="AFTERNOON">Nachmittag</option>
            <option value="EVENING">Abend</option>
            <option value="FLEXIBLE">Flexibel</option>
          </select>
        </label>

        <label className="space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Priorität
          <select
            value={props.schedule.speed}
            onChange={(e) =>
              props.onScheduleChange({
                ...props.schedule,
                speed: e.target.value as ScheduleState["speed"],
              })
            }
            className="w-full rounded-xl border border-slate-300/80 bg-white/75 px-3 py-2 text-sm font-semibold outline-none transition focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900/65 dark:text-slate-100"
          >
            <option value="ECONOMY">Economy</option>
            <option value="STANDARD">Standard</option>
            <option value="EXPRESS">Express</option>
          </select>
        </label>
      </div>

      <label className="block space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Hinweise (optional)
        <textarea
          value={props.value.note}
          onChange={(e) => props.onChange({ ...props.value, note: e.target.value })}
          maxLength={300}
          rows={3}
          className="w-full rounded-xl border border-slate-300/80 bg-white/75 px-3 py-2 text-sm font-medium outline-none transition focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900/65 dark:text-slate-100"
          placeholder="Zugang, Besonderheiten oder Rückruffenster"
        />
      </label>
    </section>
  );
}




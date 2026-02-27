"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import styles from "@/app/booking-v2/booking-v2.module.css";
import type { ContactState } from "@/app/booking-v2/components/types";

type ContactErrors = Partial<Record<keyof ContactState, string>>;

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

export function validateContact(contact: ContactState): ContactErrors {
  const errors: ContactErrors = {};
  if (contact.fullName.trim().length < 2) errors.fullName = "Bitte geben Sie einen vollständigen Namen ein.";
  if (!/^\+?[0-9\s\-()]{6,}$/.test(contact.phone.trim())) errors.phone = "Bitte geben Sie eine gültige Telefonnummer ein.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) errors.email = "Bitte geben Sie eine gültige E-Mail-Adresse ein.";
  return errors;
}

export function ContactSection(props: {
  value: ContactState;
  errors: ContactErrors;
  onChange: (next: ContactState) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">5. Kontakt</h2>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Wir bestätigen das finale Angebot nach Prüfung Ihrer Angaben.
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
    </section>
  );
}


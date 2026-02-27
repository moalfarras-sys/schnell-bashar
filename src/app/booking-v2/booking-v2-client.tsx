"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

import { Container } from "@/components/container";
import styles from "@/app/booking-v2/booking-v2.module.css";
import { ServiceSelection } from "@/app/booking-v2/components/service-selection";
import { SmartAddressSection } from "@/app/booking-v2/components/smart-address";
import { VolumeEstimatorSection } from "@/app/booking-v2/components/volume-estimator";
import { ExtrasSection } from "@/app/booking-v2/components/extras-section";
import { ContactSection, validateContact } from "@/app/booking-v2/components/contact-section";
import { LivePriceEngineCard } from "@/app/booking-v2/components/live-price-engine";
import { bookingSteps, StepNavigation } from "@/app/booking-v2/components/step-navigation";
import { calculateBookingPrice } from "@/app/booking-v2/lib/pricing";
import type { BookingDraft } from "@/app/booking-v2/components/types";

export function BookingV2Client(props: { initialContext?: string }) {
  const initialContext = String(props.initialContext ?? "").toUpperCase();
  const topRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const [draft, setDraft] = useState<BookingDraft>(() => ({
    service:
      initialContext === "MONTAGE"
        ? "ASSEMBLY"
        : initialContext === "ENTSORGUNG" || initialContext === "DISPOSAL"
          ? "DISPOSAL"
          : initialContext === "COMBO" || initialContext === "BOTH"
            ? "COMBO"
            : "MOVING",
    volumeM3: 24,
    preset: "2zimmer",
    extras: {
      packing: initialContext === "MONTAGE",
      stairs: false,
      express: false,
      noParkingZone: false,
      disposalBags: false,
    },
    contact: {
      fullName: "",
      phone: "",
      email: "",
    },
  }));

  const price = useMemo(
    () =>
      calculateBookingPrice({
        service: draft.service,
        distanceKm,
        volumeM3: draft.volumeM3,
        extras: draft.extras,
      }),
    [distanceKm, draft.extras, draft.service, draft.volumeM3],
  );

  const contactErrors = useMemo(() => validateContact(draft.contact), [draft.contact]);

  const stepError = useMemo(() => {
    if (step === 1) {
      if ((draft.service === "MOVING" || draft.service === "COMBO") && (!draft.from || !draft.to)) {
        return "Bitte geben Sie Start- und Zieladresse vollständig an.";
      }
      if ((draft.service === "DISPOSAL" || draft.service === "ASSEMBLY") && !draft.to) {
        return "Bitte geben Sie die Einsatzadresse vollständig an.";
      }
    }
    if (step === 4 && Object.keys(contactErrors).length > 0) {
      return "Bitte korrigieren Sie die Kontaktdaten.";
    }
    return null;
  }, [contactErrors, draft.from, draft.service, draft.to, step]);

  const goStep = (next: number) => {
    setStep(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const nextStep = () => {
    if (stepError) return;
    goStep(Math.min(step + 1, bookingSteps.length - 1));
  };

  const prevStep = () => goStep(Math.max(step - 1, 0));

  return (
    <main className={styles.page}>
      <Container className="relative z-10 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl" ref={topRef}>
          <div className={`${styles.glass} rounded-3xl p-5 sm:p-7`}>
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-200">Buchungsportal</div>
            <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white sm:text-5xl">Modernes Buchungssystem</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium text-slate-600 dark:text-slate-300 sm:text-base">
              Moderne Glas-Oberfläche, intelligente Schritte und Echtzeit-Kalkulation für Umzug, Entsorgung und Montage.
            </p>
            <div className="mt-5">
              <StepNavigation current={step} onChange={goStep} />
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className={`${styles.glass} rounded-3xl p-5 sm:p-7`}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="space-y-6"
                >
                  {step === 0 ? (
                    <ServiceSelection value={draft.service} onChange={(service) => setDraft((prev) => ({ ...prev, service }))} />
                  ) : null}

                  {step === 1 ? (
                    <SmartAddressSection
                      service={draft.service}
                      from={draft.from}
                      to={draft.to}
                      onFromChange={(from) => setDraft((prev) => ({ ...prev, from }))}
                      onToChange={(to) => setDraft((prev) => ({ ...prev, to }))}
                      onDistanceChange={setDistanceKm}
                    />
                  ) : null}

                  {step === 2 ? (
                    <VolumeEstimatorSection
                      value={draft.volumeM3}
                      preset={draft.preset}
                      onValueChange={(volumeM3) => setDraft((prev) => ({ ...prev, volumeM3 }))}
                      onPresetChange={(preset) => setDraft((prev) => ({ ...prev, preset }))}
                    />
                  ) : null}

                  {step === 3 ? (
                    <ExtrasSection value={draft.extras} onChange={(extras) => setDraft((prev) => ({ ...prev, extras }))} />
                  ) : null}

                  {step === 4 ? (
                    <ContactSection
                      value={draft.contact}
                      errors={contactErrors}
                      onChange={(contact) => setDraft((prev) => ({ ...prev, contact }))}
                    />
                  ) : null}

                  {stepError ? (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-red-300/80 bg-red-100/70 px-3 py-2 text-sm font-semibold text-red-800 dark:border-red-400/50 dark:bg-red-900/20 dark:text-red-200"
                    >
                      {stepError}
                    </motion.div>
                  ) : null}

                  {submitted ? (
                    <div className="rounded-xl border border-emerald-300/70 bg-emerald-100/65 px-3 py-2 text-sm font-semibold text-emerald-900 dark:border-emerald-400/50 dark:bg-emerald-900/20 dark:text-emerald-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Anfrage vorbereitet. Unser Team meldet sich mit der finalen Bestätigung.
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={step === 0}
                  className={`${styles.glowButton} inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300/80 bg-white/60 px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:border-cyan-300 disabled:opacity-45 dark:border-slate-700 dark:bg-slate-900/55 dark:text-slate-100`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Zurück
                </button>

                {step < bookingSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className={`${styles.glowButton} inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/70 bg-cyan-500/15 px-4 py-2.5 text-sm font-bold text-cyan-800 transition hover:bg-cyan-500/25 dark:text-cyan-100`}
                  >
                    Weiter
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (stepError) return;
                      setSubmitted(true);
                    }}
                    className={`${styles.glowButton} inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/70 bg-emerald-500/15 px-4 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-500/25 dark:text-emerald-100`}
                  >
                    Anfrage senden
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </section>

            <LivePriceEngineCard price={price} distanceKm={distanceKm} volumeM3={draft.volumeM3} />
          </div>
        </div>
      </Container>
    </main>
  );
}

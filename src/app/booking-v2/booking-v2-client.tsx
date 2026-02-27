"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

import { Container } from "@/components/container";
import styles from "@/app/booking-v2/booking-v2.module.css";
import { ServiceSelection } from "@/app/booking-v2/components/service-selection";
import { SmartAddressSection } from "@/app/booking-v2/components/smart-address";
import { VolumeEstimatorSection } from "@/app/booking-v2/components/volume-estimator";
import { ExtrasSection } from "@/app/booking-v2/components/extras-section";
import { ContactSection, validateContactAndSchedule } from "@/app/booking-v2/components/contact-section";
import { LivePriceEngineCard } from "@/app/booking-v2/components/live-price-engine";
import { bookingSteps, StepNavigation } from "@/app/booking-v2/components/step-navigation";
import {
  formatEuroFromCents,
  toApiServiceType,
  toBookingContext,
  toServiceCart,
  toWizardPackageTier,
  toWizardServiceType,
  type PriceCalcResponse,
} from "@/app/booking-v2/lib/pricing";
import type { BookingDraft } from "@/app/booking-v2/components/types";

function toIsoAtHour(dateInput: string, hour: number) {
  const date = new Date(`${dateInput}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function mapTimeWindowToHours(window: BookingDraft["schedule"]["timeWindow"]) {
  if (window === "MORNING") return { from: 8, to: 12 };
  if (window === "AFTERNOON") return { from: 13, to: 17 };
  if (window === "EVENING") return { from: 17, to: 20 };
  return { from: 9, to: 18 };
}

export function BookingV2Client(props: { initialContext?: string; initialQuoteId?: string }) {
  const router = useRouter();
  const initialContext = String(props.initialContext ?? "").toUpperCase();
  const initialQuoteId = String(props.initialQuoteId ?? "").trim();
  const topRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [calcState, setCalcState] = useState<{ loading: boolean; error: string | null; data: PriceCalcResponse | null }>({
    loading: false,
    error: null,
    data: null,
  });
  const [quoteBanner, setQuoteBanner] = useState<string | null>(null);
  const [quoteHydrated, setQuoteHydrated] = useState(false);

  const [draft, setDraft] = useState<BookingDraft>(() => ({
    service:
      initialContext === "MONTAGE"
        ? "ASSEMBLY"
        : initialContext === "ENTSORGUNG" || initialContext === "DISPOSAL"
          ? "DISPOSAL"
          : initialContext === "COMBO" || initialContext === "BOTH"
            ? "COMBO"
            : "MOVING",
    quoteId: initialQuoteId || undefined,
    volumeM3: 24,
    preset: "2zimmer",
    extras: {
      packing: false,
      stairs: false,
      express: false,
      noParkingZone: false,
      disposalBags: false,
    },
    contact: {
      fullName: "",
      phone: "",
      email: "",
      note: "",
    },
    schedule: {
      desiredDate: "",
      timeWindow: "FLEXIBLE",
      speed: "STANDARD",
    },
  }));

  const contactErrors = useMemo(
    () => validateContactAndSchedule(draft.contact, draft.schedule),
    [draft.contact, draft.schedule],
  );

  const distanceKm = calcState.data?.breakdown?.distanceKm ?? 0;

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
      return "Bitte prüfen Sie die markierten Angaben.";
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

  useEffect(() => {
    if (!initialQuoteId) {
      setQuoteHydrated(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/quotes/${encodeURIComponent(initialQuoteId)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          snapshot?: {
            quoteId: string;
            draft: {
              serviceContext: "MOVING" | "MONTAGE" | "ENTSORGUNG" | "SPEZIALSERVICE" | "COMBO";
              packageSpeed: "ECONOMY" | "STANDARD" | "EXPRESS";
              volumeM3: number;
              fromAddress?: BookingDraft["from"];
              toAddress?: BookingDraft["to"];
              extras: BookingDraft["extras"];
            };
          };
        };
        if (!json.snapshot || cancelled) return;
        const mapService: Record<typeof json.snapshot.draft.serviceContext, BookingDraft["service"]> = {
          MOVING: "MOVING",
          MONTAGE: "ASSEMBLY",
          ENTSORGUNG: "DISPOSAL",
          SPEZIALSERVICE: "ASSEMBLY",
          COMBO: "COMBO",
        };
        setDraft((prev) => ({
          ...prev,
          quoteId: json.snapshot!.quoteId,
          service: mapService[json.snapshot!.draft.serviceContext] ?? prev.service,
          volumeM3: json.snapshot!.draft.volumeM3 ?? prev.volumeM3,
          from: json.snapshot!.draft.fromAddress ?? prev.from,
          to: json.snapshot!.draft.toAddress ?? prev.to,
          extras: json.snapshot!.draft.extras ?? prev.extras,
          schedule: {
            ...prev.schedule,
            speed: json.snapshot!.draft.packageSpeed ?? prev.schedule.speed,
          },
        }));
        setQuoteBanner("Angebot übernommen");
      } catch {
        // best effort
      } finally {
        if (!cancelled) setQuoteHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialQuoteId]);

  useEffect(() => {
    if (!quoteHydrated) return;
    const id = setTimeout(async () => {
      const serviceCart = toServiceCart(draft.service);
      const needsRoute = draft.service === "MOVING" || draft.service === "COMBO";
      const fromAddress = needsRoute ? draft.from?.displayName : undefined;
      const toAddress = needsRoute ? draft.to?.displayName : draft.to?.displayName;

      const addons: Array<"PACKING" | "DISMANTLE_ASSEMBLE" | "OLD_KITCHEN_DISPOSAL" | "BASEMENT_ATTIC_CLEARING"> = [];
      if (draft.extras.packing) addons.push("PACKING");
      if (draft.extras.stairs) addons.push("DISMANTLE_ASSEMBLE");
      if (draft.extras.disposalBags) addons.push("BASEMENT_ATTIC_CLEARING");

      setCalcState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const res = await fetch("/api/price/calc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceType: toApiServiceType(draft.service),
            serviceCart,
            speed: draft.extras.express ? "EXPRESS" : draft.schedule.speed,
            volumeM3: draft.volumeM3,
            floors: draft.extras.stairs ? 2 : 0,
            hasElevator: false,
            needNoParkingZone: draft.extras.noParkingZone,
            addons,
            fromAddressObject: draft.from,
            toAddressObject: draft.to,
            fromAddress,
            toAddress,
          }),
        });

        const json = (await res.json()) as PriceCalcResponse | { error?: string };
        if (!res.ok) {
          throw new Error(("error" in json && json.error) || "Preisberechnung fehlgeschlagen.");
        }

        setCalcState({ loading: false, error: null, data: json as PriceCalcResponse });
      } catch (error) {
        setCalcState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Preisberechnung fehlgeschlagen.",
        }));
      }
    }, 300);

    return () => clearTimeout(id);
  }, [
    quoteHydrated,
    draft.service,
    draft.from,
    draft.to,
    draft.from?.displayName,
    draft.to?.displayName,
    draft.volumeM3,
    draft.extras.packing,
    draft.extras.stairs,
    draft.extras.express,
    draft.extras.noParkingZone,
    draft.extras.disposalBags,
    draft.schedule.speed,
  ]);

  useEffect(() => {
    if (!draft.quoteId || !quoteHydrated) return;
    const id = setTimeout(async () => {
      const quoteId = draft.quoteId;
      if (!quoteId) return;
      const serviceContextMap: Record<
        BookingDraft["service"],
        "MOVING" | "MONTAGE" | "ENTSORGUNG" | "SPEZIALSERVICE" | "COMBO"
      > = {
        MOVING: "MOVING",
        DISPOSAL: "ENTSORGUNG",
        ASSEMBLY: "MONTAGE",
        COMBO: "COMBO",
      };
      await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: {
            serviceContext: serviceContextMap[draft.service],
            packageSpeed: draft.extras.express ? "EXPRESS" : draft.schedule.speed,
            volumeM3: draft.volumeM3,
            floors: draft.extras.stairs ? 2 : 0,
            hasElevator: false,
            needNoParkingZone: draft.extras.noParkingZone,
            fromAddress: draft.from,
            toAddress: draft.to,
            extras: draft.extras,
            selectedServiceOptions: [],
          },
        }),
      });
    }, 450);

    return () => clearTimeout(id);
  }, [
    draft.quoteId,
    quoteHydrated,
    draft.service,
    draft.extras.express,
    draft.schedule.speed,
    draft.volumeM3,
    draft.extras.stairs,
    draft.extras.noParkingZone,
    draft.extras,
    draft.from,
    draft.to,
  ]);

  async function submitBooking() {
    if (stepError || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const speed = draft.extras.express ? "EXPRESS" : draft.schedule.speed;
      const serviceType = toWizardServiceType(draft.service);
      const bookingContext = toBookingContext(draft.service);
      const serviceCart = toServiceCart(draft.service);
      const hours = mapTimeWindowToHours(draft.schedule.timeWindow);
      const requestedFrom = toIsoAtHour(draft.schedule.desiredDate, hours.from);
      const requestedTo = toIsoAtHour(draft.schedule.desiredDate, hours.to);

      if (!requestedFrom || !requestedTo) {
        throw new Error("Bitte wählen Sie ein gültiges Wunschdatum.");
      }

      if ((draft.service === "MOVING" || draft.service === "COMBO") && (!draft.from || !draft.to)) {
        throw new Error("Bitte geben Sie Start- und Zieladresse vollständig an.");
      }

      if ((draft.service === "DISPOSAL" || draft.service === "ASSEMBLY") && !draft.to) {
        throw new Error("Bitte geben Sie die Einsatzadresse vollständig an.");
      }

      const addons: Array<"PACKING" | "DISMANTLE_ASSEMBLE" | "OLD_KITCHEN_DISPOSAL" | "BASEMENT_ATTIC_CLEARING"> = [];
      if (draft.extras.packing) addons.push("PACKING");
      if (draft.extras.stairs) addons.push("DISMANTLE_ASSEMBLE");
      if (draft.extras.disposalBags) addons.push("BASEMENT_ATTIC_CLEARING");

      const access = {
        propertyType: "apartment" as const,
        floor: draft.extras.stairs ? 2 : 0,
        elevator: "none" as const,
        stairs: draft.extras.stairs ? ("few" as const) : ("none" as const),
        parking: draft.extras.noParkingZone ? ("hard" as const) : ("easy" as const),
        needNoParkingZone: draft.extras.noParkingZone,
        carryDistanceM: 0,
      };

      const payload = {
        payloadVersion: 2,
        bookingContext,
        packageTier: toWizardPackageTier(speed),
        serviceCart,
        selectedServiceOptions: [],
        serviceType,
        addons,
        pickupAddress: draft.service === "DISPOSAL" || draft.service === "ASSEMBLY" ? draft.to : undefined,
        startAddress: draft.service === "MOVING" || draft.service === "COMBO" ? draft.from : undefined,
        destinationAddress: draft.service === "MOVING" || draft.service === "COMBO" ? draft.to : undefined,
        accessPickup: draft.service === "DISPOSAL" || draft.service === "ASSEMBLY" ? access : undefined,
        accessStart: draft.service === "MOVING" || draft.service === "COMBO" ? access : undefined,
        accessDestination: draft.service === "MOVING" || draft.service === "COMBO" ? access : undefined,
        itemsMove: {},
        itemsDisposal: {},
        disposal:
          draft.service === "DISPOSAL" || draft.service === "COMBO"
            ? {
                categories: ["mixed" as const],
                volumeExtraM3: draft.extras.disposalBags ? 1 : 0,
                forbiddenConfirmed: true,
              }
            : undefined,
        timing: {
          speed,
          requestedFrom,
          requestedTo,
          preferredTimeWindow: draft.schedule.timeWindow,
          jobDurationMinutes: Math.max(
            60,
            Math.round((calcState.data?.breakdown?.laborHours ?? 2) * 60),
          ),
        },
        customer: {
          name: draft.contact.fullName.trim(),
          phone: draft.contact.phone.trim(),
          email: draft.contact.email.trim(),
          contactPreference: "PHONE" as const,
          note: draft.contact.note.trim(),
        },
      };

      const form = new FormData();
      form.set("payload", JSON.stringify(payload));
      if (draft.quoteId) form.set("quoteId", draft.quoteId);

      const res = await fetch("/api/orders", {
        method: "POST",
        body: form,
      });

      const json = (await res.json()) as
        | {
            ok?: boolean;
            publicId?: string;
            pdfToken?: string;
            offer?: { token?: string; offerNo?: string };
            error?: string;
          }
        | { error?: string };

      if (!res.ok || !json || !("publicId" in json) || !json.publicId) {
        throw new Error(("error" in json && json.error) || "Anfrage konnte nicht gesendet werden.");
      }

      const params = new URLSearchParams();
      params.set("order", json.publicId);
      if ("pdfToken" in json && json.pdfToken) params.set("token", json.pdfToken);
      if ("offer" in json && json.offer?.token) params.set("offerToken", json.offer.token);
      if ("offer" in json && json.offer?.offerNo) params.set("offerNo", json.offer.offerNo);

      router.push(`/buchung/bestaetigt?${params.toString()}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Senden fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedRange = calcState.data?.totals
    ? `${formatEuroFromCents(calcState.data.totals.minCents)} - ${formatEuroFromCents(calcState.data.totals.maxCents)}`
    : "Preis wird berechnet";

  return (
    <section className={styles.page}>
      <Container className="relative z-10 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl" ref={topRef}>
          <div className={`${styles.glass} rounded-3xl p-5 sm:p-7`}>
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-200">Buchungsportal</div>
            <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white sm:text-5xl">Jetzt buchen</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium text-slate-600 dark:text-slate-300 sm:text-base">
              Integrierte Live-Kalkulation mit direktem Versand an unser Dispositionssystem.
            </p>
            <div className="mt-2 rounded-xl border border-slate-300/70 bg-white/60 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/45 dark:text-slate-200">
              Aktueller Bereich: {selectedRange}
            </div>
            {quoteBanner ? (
              <div className="mt-2 rounded-xl border border-emerald-300/80 bg-emerald-100/70 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-200">
                {quoteBanner}
              </div>
            ) : null}
            <div className="mt-2">
              <a
                href={draft.quoteId ? `/preise?quoteId=${encodeURIComponent(draft.quoteId)}` : "/preise"}
                className="text-sm font-semibold text-cyan-700 underline underline-offset-2 dark:text-cyan-300"
              >
                Zurück zum Preisrechner
              </a>
            </div>
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
                      distanceKm={distanceKm}
                      distanceSource={calcState.data?.breakdown?.distanceSource}
                      loading={calcState.loading}
                      error={calcState.error}
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
                      schedule={draft.schedule}
                      errors={contactErrors}
                      onChange={(contact) => setDraft((prev) => ({ ...prev, contact }))}
                      onScheduleChange={(schedule) => setDraft((prev) => ({ ...prev, schedule }))}
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

                  {submitError ? (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-red-300/80 bg-red-100/70 px-3 py-2 text-sm font-semibold text-red-800 dark:border-red-400/50 dark:bg-red-900/20 dark:text-red-200"
                    >
                      {submitError}
                    </motion.div>
                  ) : null}
                </motion.div>
              </AnimatePresence>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={step === 0 || submitting}
                  className={`${styles.glowButton} inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300/80 bg-white/60 px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:border-cyan-300 disabled:opacity-45 dark:border-slate-700 dark:bg-slate-900/55 dark:text-slate-100`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Zurück
                </button>

                {step < bookingSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={submitting}
                    className={`${styles.glowButton} inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/70 bg-cyan-500/15 px-4 py-2.5 text-sm font-bold text-cyan-800 transition hover:bg-cyan-500/25 disabled:opacity-50 dark:text-cyan-100`}
                  >
                    Weiter
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submitBooking}
                    disabled={!!stepError || submitting}
                    className={`${styles.glowButton} inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/70 bg-emerald-500/15 px-4 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-500/25 disabled:opacity-50 dark:text-emerald-100`}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {submitting ? "Wird gesendet..." : "Anfrage senden"}
                  </button>
                )}
              </div>
            </section>

            <LivePriceEngineCard
              calc={calcState.data}
              loading={calcState.loading}
              error={calcState.error}
              distanceKm={distanceKm}
              volumeM3={draft.volumeM3}
            />
          </div>
        </div>
      </Container>
    </section>
  );
}




"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DayPicker, type Matcher } from "react-day-picker";
import { addDays, format } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarDays, CheckCircle2, Loader2 } from "lucide-react";
import "react-day-picker/style.css";

import { Input } from "@/components/ui/input";
import { cn } from "@/components/ui/cn";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/container";
import { formatNumberDE } from "@/lib/format-number";

const INQUIRY_KEY = "ssu_inquiry";

type InquiryData = {
  serviceType: "UMZUG" | "ENTSORGUNG" | "KOMBI";
  speed: "ECONOMY" | "STANDARD" | "EXPRESS";
  volumeM3: number;
  floors: number;
  hasElevator: boolean;
  needNoParkingZone: boolean;
  addons: string[];
  fromAddress?: string;
  toAddress?: string;
  distanceKm?: number;
  distanceSource?: "ors" | "cache";
  driveChargeCents?: number;
  price: {
    netCents: number;
    vatCents: number;
    grossCents: number;
    minCents: number;
    maxCents: number;
  };
};

const serviceTypeLabels: Record<InquiryData["serviceType"], string> = {
  UMZUG: "Umzug",
  ENTSORGUNG: "Entsorgung",
  KOMBI: "Umzug + Entsorgung",
};

type Slot = {
  start: string;
  end: string;
  label: string;
};

export default function BookingAppointmentPage() {
  const router = useRouter();
  const [inquiry, setInquiry] = useState<InquiryData | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(INQUIRY_KEY);
      if (!raw) {
        router.replace("/preise");
        return;
      }
      setInquiry(JSON.parse(raw));
    } catch {
      router.replace("/preise");
    }
  }, [router]);

  const loadAvailableDates = useCallback(() => {
    if (!inquiry) return;
    const from = format(new Date(), "yyyy-MM-dd");
    const to = format(addDays(new Date(), 365), "yyyy-MM-dd");

    setLoadingDates(true);
    setDateError(null);

    fetch(`/api/availability/dates?from=${from}&to=${to}&speed=${inquiry.speed}&volumeM3=${inquiry.volumeM3}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setDateError(data?.error || data?.details || "Verfügbare Tage konnten nicht geladen werden.");
          setAvailableDates([]);
          setDemoMode(false);
          return;
        }
        setAvailableDates(Array.isArray(data?.availableDates) ? data.availableDates : []);
        setDateError(null);
        setDemoMode(Boolean(data?.demoMode));
      })
      .catch(() => {
        setDateError("Verfügbare Tage konnten nicht geladen werden.");
        setAvailableDates([]);
      })
      .finally(() => setLoadingDates(false));
  }, [inquiry]);

  useEffect(() => {
    if (inquiry) loadAvailableDates();
  }, [inquiry, loadAvailableDates]);

  useEffect(() => {
    if (!inquiry || !selectedDate) {
      setSlots([]);
      setSelectedSlotStart(null);
      return;
    }

    const date = format(selectedDate, "yyyy-MM-dd");
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlotStart(null);

    fetch(`/api/availability/slots?date=${date}&speed=${inquiry.speed}&volumeM3=${inquiry.volumeM3 ?? 1}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setSlots([]);
          return;
        }

        const parsed: Slot[] = Array.isArray(data?.slots)
          ? (data.slots as unknown[]).flatMap((entry) => {
              if (
                !entry ||
                typeof entry !== "object" ||
                !("start" in entry) ||
                !("end" in entry) ||
                !("label" in entry)
              ) {
                return [];
              }

              const start = (entry as { start: unknown }).start;
              const end = (entry as { end: unknown }).end;
              const label = (entry as { label: unknown }).label;
              if (typeof start !== "string" || typeof end !== "string" || typeof label !== "string") {
                return [];
              }
              return [{ start, end, label }];
            })
          : [];
        setSlots(parsed);
      })
      .catch((err) => {
        console.warn("[slots] fetch failed:", err);
        setSlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [inquiry, selectedDate]);

  async function confirmBooking() {
    if (!inquiry || !selectedSlotStart) return;
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setSubmitError("Bitte füllen Sie alle Kontaktdaten aus.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/booking/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiry,
          slotStart: selectedSlotStart,
          customer: { name: name.trim(), email: email.trim(), phone: phone.trim() },
        }),
      });

      const raw = await res.text();
      let data: { error?: string; trackingCode?: string; pdfToken?: string } | null = null;
      if (raw) {
        try {
          data = JSON.parse(raw) as { error?: string; trackingCode?: string; pdfToken?: string };
        } catch {
          data = null;
        }
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Buchung konnte serverseitig nicht verarbeitet werden. Bitte erneut versuchen.",
        );
      }

      if (!data?.trackingCode) {
        throw new Error(
          "Buchung wurde angenommen, aber die Antwort ist unvollständig. Bitte aktualisieren Sie die Seite.",
        );
      }

      sessionStorage.removeItem(INQUIRY_KEY);
      const params = new URLSearchParams({ code: data.trackingCode });
      if (data.pdfToken) params.set("token", data.pdfToken);
      router.push(`/buchung/bestaetigt?${params.toString()}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Buchung fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!inquiry) {
    return (
      <Container className="py-14">
        <div className="flex items-center justify-center gap-2 py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Laden...</span>
        </div>
      </Container>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const disabledDays: Matcher[] = [
    { before: today },
    ...(availableDates.length > 0
      ? [
          (date: Date) => {
            const day = format(date, "yyyy-MM-dd");
            return !availableDates.includes(day);
          },
        ]
      : []),
  ];

  const selectedLabel = selectedSlotStart ? slots.find((s) => s.start === selectedSlotStart)?.label : null;

  return (
    <Container className="py-14">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
          Termin & Kalender
        </h1>
        <p className="mt-4 text-base text-slate-700 dark:text-slate-300">
          Wählen Sie Datum und Uhrzeit für Ihre Buchung. Nicht verfügbare Zeitfenster sind ausgegraut.
        </p>

        {demoMode && (
          <div className="mt-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-300">
            <p>
              <strong>Demo-Modus:</strong> Die Datenbank ist nicht erreichbar. Es werden Demo-Termine angezeigt.
              Für die echte Buchung bitte <code className="rounded bg-amber-200 px-1">npm run db:up</code>,{" "}
              <code className="rounded bg-amber-200 px-1">npm run prisma:migrate</code> und{" "}
              <code className="rounded bg-amber-200 px-1">npm run db:seed</code> ausführen.
            </p>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="rounded-3xl border-2 border-slate-200 bg-[color:var(--surface-elevated)] p-6 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
            <div className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
              <CalendarDays className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              Datum wählen
            </div>

            {dateError && (
              <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-300">
                <p className="mb-2">{dateError}</p>
                <p className="mb-2 text-xs text-amber-700">Datenbank-Setup: Falls noch nicht geschehen, bitte nacheinander ausführen:</p>
                <ol className="mb-3 list-inside list-decimal space-y-1 text-xs text-amber-700">
                  <li><code className="rounded bg-amber-200 px-1">npm run db:up</code> (Datenbank starten)</li>
                  <li><code className="rounded bg-amber-200 px-1">npm run prisma:migrate</code> (Tabellen anlegen)</li>
                  <li><code className="rounded bg-amber-200 px-1">npm run db:seed</code> (Preise & Katalog laden)</li>
                </ol>
                <Button type="button" variant="outline" size="sm" onClick={loadAvailableDates} disabled={loadingDates}>
                  Erneut laden
                </Button>
              </div>
            )}

            <div className="mt-4 [&_.rdp]:mx-auto">
              {loadingDates ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Verfügbare Tage werden geladen...</span>
                </div>
              ) : (
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={disabledDays}
                  locale={de}
                  fromDate={today}
                  toDate={addDays(today, 365)}
                  formatters={{
                    formatWeekdayName: (date) => format(date, "EE", { locale: de }),
                  }}
                  classNames={{
                    root: "rdp-root",
                    month_caption: "rdp-month_caption",
                    weekdays: "rdp-weekdays",
                    weekday: "rdp-weekday text-center text-sm font-extrabold text-slate-900 dark:text-slate-100",
                    day_button:
                      "h-10 w-10 rounded-xl text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
                    selected:
                      "bg-brand-600 text-white hover:bg-brand-600 focus:bg-brand-600 dark:bg-brand-500 dark:text-slate-950",
                    disabled: "text-slate-300 opacity-45 dark:text-slate-600",
                    today: "ring-1 ring-brand-400 dark:ring-brand-500",
                    outside: "text-slate-300 dark:text-slate-700",
                  }}
                />
              )}
            </div>
          </div>

          <div className="rounded-3xl border-2 border-slate-200 bg-[color:var(--surface-elevated)] p-6 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
            <div className="text-lg font-extrabold text-slate-900 dark:text-white">Zeitfenster wählen</div>
            {selectedDate ? (
              <div className="mt-4">
                {loadingSlots ? (
                  <div className="flex items-center gap-2 py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Verfügbarkeit wird geladen...</span>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-300">
                    Keine verfügbaren Zeitfenster für dieses Datum. Bitte wählen Sie ein anderes Datum.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {slots.map((slot) => {
                      const active = selectedSlotStart === slot.start;
                      return (
                        <button
                          key={slot.start}
                          type="button"
                          onClick={() => setSelectedSlotStart(slot.start)}
                          className={cn(
                            "rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all",
                            active
                              ? "border-brand-500 bg-brand-50 text-brand-800 shadow-md dark:border-brand-400 dark:bg-brand-950/40 dark:text-brand-300"
                              : "border-slate-300 bg-[color:var(--surface-elevated)] text-slate-700 hover:border-brand-400 hover:bg-brand-50/50 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-brand-500/50 dark:hover:bg-slate-800",
                          )}
                        >
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Bitte wählen Sie zuerst ein Datum.</p>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border-2 border-slate-200 bg-[color:var(--surface-elevated)] p-6 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
          <div className="text-lg font-extrabold text-slate-900 dark:text-white">Ihre Kontaktdaten</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Max Mustermann" required className="border-2 border-slate-300" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">E-Mail *</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="max@example.de" required className="border-2 border-slate-300" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">Telefon *</label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+49 172 1234567" required className="border-2 border-slate-300" />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border-2 border-brand-400 bg-gradient-to-r from-brand-50 to-blue-50 p-6 shadow-md dark:border-brand-500/40 dark:from-brand-950/40 dark:to-blue-950/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-brand-900 dark:text-brand-300">Zusammenfassung</div>
              <div className="mt-1 text-slate-700 dark:text-slate-300">
                {serviceTypeLabels[inquiry.serviceType]} · {formatNumberDE(inquiry.volumeM3)} m³ ·{" "}
                {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
                  inquiry.price.grossCents / 100,
                )}{" "}
                inkl. MwSt.
              </div>
              {selectedDate && selectedLabel && (
                <div className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Termin: {format(selectedDate, "dd.MM.yyyy", { locale: de })} {selectedLabel}
                </div>
              )}
            </div>
            <Button size="lg" disabled={!selectedSlotStart || submitting} onClick={confirmBooking} className="gap-2">
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Wird gebucht...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Buchung bestätigen
                </>
              )}
            </Button>
          </div>
          {submitError && (
            <div className="mt-4 rounded-xl border-2 border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-500/30 dark:bg-red-950/20 dark:text-red-300">
              {submitError}
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/preise" className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-400">
            Zurück zur Preisberechnung
          </Link>
        </div>
      </div>
    </Container>
  );
}

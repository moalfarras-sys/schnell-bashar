"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  BadgeEuro,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  Phone,
  Send,
} from "lucide-react";
import { addDays, addMonths, eachDayOfInterval, format, isBefore, isSameDay, startOfMonth, startOfWeek, endOfWeek, endOfMonth } from "date-fns";
import { de } from "date-fns/locale";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const INQUIRY_STORAGE_KEY = "ssu_inquiry";
const DAY_NAMES = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

type Slot = { start: string; end: string };
type SlotsResponse = { effectiveFrom: string; to: string; slots: Slot[]; demoMode?: boolean };
type InquiryData = {
  serviceType: string;
  serviceCart: Array<{ kind: string; qty: number; titleDe?: string }>;
  speed: string;
  volumeM3: number;
  fromAddress?: string;
  toAddress?: string;
  estimate?: { priceGross?: number; totals?: { grossCents: number } };
};

function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function SkeletonSlots() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      ))}
    </div>
  );
}

export default function BuchungTerminPage() {
  const router = useRouter();

  const [inquiry, setInquiry] = useState<InquiryData | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(INQUIRY_STORAGE_KEY);
      if (raw) setInquiry(JSON.parse(raw));
    } catch {}
  }, []);

  const speed = (inquiry?.speed as string) ?? "STANDARD";
  const durationMinutes = Math.max(120, Math.min(480, (inquiry?.volumeM3 ?? 12) * 15));

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const loadSlots = useCallback(
    async (date: Date) => {
      setSlotsLoading(true);
      setSlotsError(null);
      setSlots([]);
      setSelectedSlot(null);
      try {
        const dateStr = format(date, "yyyy-MM-dd");
        const params = new URLSearchParams({
          speed,
          from: dateStr,
          to: dateStr,
          durationMinutes: String(durationMinutes),
        });
        const res = await fetch(`/api/slots?${params.toString()}`);
        if (!res.ok) throw new Error("Zeitfenster konnten nicht geladen werden.");
        const data: SlotsResponse = await res.json();
        setSlots(data.slots ?? []);
      } catch (e) {
        setSlotsError(e instanceof Error ? e.message : "Fehler beim Laden der Zeitfenster.");
      } finally {
        setSlotsLoading(false);
      }
    },
    [speed, durationMinutes],
  );

  function handleDateSelect(date: Date) {
    if (isBefore(date, addDays(new Date(), -1))) return;
    if (date.getDay() === 0) return;
    setSelectedDate(date);
    loadSlots(date);
  }

  async function handleConfirm() {
    if (!selectedSlot || !name.trim() || !email.trim() || !phone.trim()) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/booking/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiry: {
            serviceType: inquiry?.serviceType ?? "UMZUG",
            speed: inquiry?.speed ?? "STANDARD",
            volumeM3: inquiry?.volumeM3 ?? 12,
            floors: 0,
            hasElevator: false,
            needNoParkingZone: false,
            addons: [],
            checklist: [],
            fromAddress: inquiry?.fromAddress ?? "",
            toAddress: inquiry?.toAddress ?? "",
          },
          slotStart: selectedSlot.start,
          slotEnd: selectedSlot.end,
          customer: {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Buchung konnte nicht bestätigt werden.");

      sessionStorage.removeItem(INQUIRY_STORAGE_KEY);
      router.push(`/buchen/bestaetigt?code=${data.trackingCode}&pdfToken=${data.pdfToken ?? ""}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Ein Fehler ist aufgetreten.");
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date();
  const grossCents = inquiry?.estimate?.totals?.grossCents ?? inquiry?.estimate?.priceGross ?? 0;

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              Termin & Kalender
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Wählen Sie einen verfügbaren Termin für Ihren Auftrag.
            </p>
          </div>
        </div>

        {/* Inquiry summary bar */}
        {inquiry ? (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3 text-sm dark:border-brand-500/30 dark:bg-brand-950/30">
            <span className="font-bold text-brand-800 dark:text-brand-300">
              {inquiry.serviceCart?.map((s) => s.titleDe ?? s.kind).join(" + ") ?? inquiry.serviceType}
            </span>
            {inquiry.volumeM3 ? (
              <span className="text-slate-600 dark:text-slate-400">· {inquiry.volumeM3} m³</span>
            ) : null}
            {grossCents > 0 ? (
              <span className="ml-auto font-extrabold text-brand-700 dark:text-brand-400">
                {eur(grossCents)}
              </span>
            ) : null}
            <Link
              href="/preise"
              className="text-xs font-semibold text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
            >
              Ändern
            </Link>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 dark:border-amber-500/40 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
              <BadgeEuro className="h-4 w-4" />
              Sie können auch direkt einen Termin wählen — oder zuerst den Preis berechnen.
            </div>
            <Link href="/preise" className="mt-2 inline-block">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Richtpreis berechnen
              </Button>
            </Link>
          </div>
        )}

        {/* Main grid: Calendar + Slots */}
        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          {/* Calendar */}
          <div className="lg:col-span-3">
            <div className="glass-card rounded-3xl p-5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                  className="rounded-xl px-3 py-1.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  ←
                </button>
                <div className="text-base font-extrabold text-slate-900 dark:text-white">
                  {format(currentMonth, "MMMM yyyy", { locale: de })}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="rounded-xl px-3 py-1.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  →
                </button>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const isPast = isBefore(day, addDays(today, -1));
                  const isSunday = day.getDay() === 0;
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, today);
                  const disabled = !isCurrentMonth || isPast || isSunday;

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleDateSelect(day)}
                      className={`relative flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition-all duration-150 sm:h-11 ${
                        isSelected
                          ? "bg-brand-600 text-white shadow-md"
                          : disabled
                            ? "cursor-default text-slate-300 dark:text-slate-600"
                            : "cursor-pointer text-slate-800 hover:bg-brand-50 hover:text-brand-700 dark:text-slate-200 dark:hover:bg-brand-950/30 dark:hover:text-brand-400"
                      }`}
                    >
                      {format(day, "d")}
                      {isToday && !isSelected && (
                        <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Time slots */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-3xl p-5">
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                {selectedDate
                  ? `Zeitfenster am ${format(selectedDate, "dd.MM.yyyy")}`
                  : "Datum wählen"}
              </div>

              <div className="mt-4">
                {!selectedDate ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    <CalendarDays className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    Bitte wählen Sie zunächst ein Datum im Kalender aus.
                  </div>
                ) : slotsLoading ? (
                  <SkeletonSlots />
                ) : slotsError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-500/30 dark:bg-red-950/20">
                    <AlertCircle className="mx-auto h-6 w-6 text-red-500" />
                    <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-300">{slotsError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => selectedDate && loadSlots(selectedDate)}
                    >
                      Erneut versuchen
                    </Button>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-500/30 dark:bg-amber-950/20">
                    <Clock className="mx-auto h-6 w-6 text-amber-500" />
                    <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                      Keine freien Termine an diesem Tag.
                    </p>
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      Bitte wählen Sie einen anderen Tag.
                    </p>
                    <a href="tel:+491729573681" className="mt-3 inline-block">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Phone className="h-3.5 w-3.5" /> Jetzt anrufen
                      </Button>
                    </a>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {slots.map((slot) => {
                      const isActive = selectedSlot?.start === slot.start;
                      return (
                        <button
                          key={slot.start}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`flex items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all duration-150 ${
                            isActive
                              ? "border-brand-500 bg-brand-50 text-brand-800 shadow-sm dark:bg-brand-900/30 dark:text-brand-200"
                              : "border-slate-200 bg-white/60 text-slate-700 hover:border-brand-300 hover:bg-brand-50/40 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-brand-500/40"
                          }`}
                        >
                          {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />}
                          {formatTime(slot.start)} – {formatTime(slot.end)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Customer form + Confirm */}
        {selectedSlot && (
          <div className="mt-8 glass-card rounded-3xl p-6">
            <div className="text-lg font-extrabold text-slate-900 dark:text-white">
              Kontaktdaten & Buchung bestätigen
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Ausgewählter Termin:{" "}
              <span className="font-bold text-slate-800 dark:text-white">
                {selectedDate && format(selectedDate, "dd.MM.yyyy")} · {formatTime(selectedSlot.start)} – {formatTime(selectedSlot.end)}
              </span>
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800 dark:text-slate-200">Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Vor- und Nachname"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800 dark:text-slate-200">E-Mail *</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.de"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800 dark:text-slate-200">Telefon *</label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+49 172 ..."
                  required
                />
              </div>
            </div>

            {submitError && (
              <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-300">
                {submitError}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="flex-1 gap-2"
                disabled={submitting || !name.trim() || !email.trim() || !phone.trim()}
                onClick={handleConfirm}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Wird gebucht...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" /> Buchung bestätigen
                  </>
                )}
              </Button>
              <a href="tel:+491729573681" className="sm:w-auto">
                <Button variant="outline" size="lg" className="w-full gap-2 sm:w-auto">
                  <Phone className="h-4 w-4" /> Rückruf anfordern
                </Button>
              </a>
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Nach Bestätigung erhalten Sie eine E-Mail mit Angebot (PDF) und Tracking-Code.
            </p>
          </div>
        )}
      </div>
    </Container>
  );
}

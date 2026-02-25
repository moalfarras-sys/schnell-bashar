/**
 * Shared scheduling logic for the preise-flow booking (availability/dates, availability/slots, booking/confirm).
 * Server-only: uses prisma and getAvailableSlots. Europe/Berlin timezone.
 */

import { addDays, format, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { prisma } from "@/server/db/prisma";
import { getAvailableSlots, type AvailabilityRuleLite, type AvailabilityExceptionLite } from "./slots";

const TZ = "Europe/Berlin";
const MAX_DATE_RANGE_DAYS = 365;

/** Round up to next multiple of grid (e.g. ceilToGrid(150, 60) => 180). */
export function ceilToGrid(value: number, grid: number): number {
  return Math.ceil(value / grid) * grid;
}

/**
 * Duration for inquiry-based booking: laborHours = max(1, ceil(volumeM3/5)),
 * then durationMinutes = ceilToGrid(laborHours*60 + 30, 60).
 */
export function durationMinutesFromVolumeM3(volumeM3: number): number {
  const laborHours = Math.max(1, Math.ceil(volumeM3 / 5));
  const rawMinutes = laborHours * 60 + 30;
  return Math.min(ceilToGrid(rawMinutes, 60), 24 * 60);
}

export function leadDaysForSpeed(
  speed: "ECONOMY" | "STANDARD" | "EXPRESS",
  pricing: { economyLeadDays: number; standardLeadDays: number; expressLeadDays: number },
): number {
  switch (speed) {
    case "ECONOMY":
      return pricing.economyLeadDays;
    case "EXPRESS":
      return pricing.expressLeadDays;
    default:
      return pricing.standardLeadDays;
  }
}

export type InquirySchedulingParams = {
  speed: "ECONOMY" | "STANDARD" | "EXPRESS";
  volumeM3: number;
  fromISO: string; // YYYY-MM-DD
  toISO: string;   // YYYY-MM-DD
};

export type InquirySchedulingContext = {
  durationMinutes: number;
  effectiveFrom: string;
  toISO: string;
  rules: AvailabilityRuleLite[];
  exceptions: AvailabilityExceptionLite[];
  existingBookings: { start: Date; end: Date }[];
};

/**
 * Load pricing, rules, exceptions, and bookings; compute effectiveFrom (lead-time clamped).
 * Caller can then use getAvailableSlots with this context.
 */
export async function loadInquirySchedulingContext(
  params: InquirySchedulingParams,
): Promise<{ context: InquirySchedulingContext; pricing: { id: string } } | { error: string }> {
  try {
    const pricing = await prisma.pricingConfig.findFirst({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
    });
    if (!pricing) return { error: "No pricing config found" };

    const leadDays = leadDaysForSpeed(params.speed, {
      economyLeadDays: pricing.economyLeadDays,
      standardLeadDays: pricing.standardLeadDays,
      expressLeadDays: pricing.expressLeadDays,
    });

    const todayISO = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
    const earliestAfterLead = format(addDays(parseISO(todayISO), Math.max(0, leadDays)), "yyyy-MM-dd");
    const effectiveFrom = params.fromISO < earliestAfterLead ? earliestAfterLead : params.fromISO;

    const rules = await prisma.availabilityRule.findMany({ where: { active: true } });
    const exceptions = await prisma.availabilityException.findMany();

    const startDay = parseISO(effectiveFrom);
    const endDay = parseISO(params.toISO);
    const start = fromZonedTime(
      new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate(), 0, 0, 0, 0),
      TZ,
    );
    const end = fromZonedTime(
      new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate(), 23, 59, 59, 999),
      TZ,
    );
    const bookings = await prisma.order.findMany({
      where: {
        slotStart: { lt: end },
        slotEnd: { gt: start },
        status: { not: "CANCELLED" },
      },
      select: { slotStart: true, slotEnd: true },
    });
    const existingBookings = bookings
      .map((b) =>
        b.slotStart && b.slotEnd
          ? { start: b.slotStart, end: b.slotEnd }
          : null,
      )
      .filter((b): b is { start: Date; end: Date } => Boolean(b));

    const durationMinutes = durationMinutesFromVolumeM3(params.volumeM3);

    return {
      context: {
        durationMinutes,
        effectiveFrom,
        toISO: params.toISO,
        rules: rules.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
          slotMinutes: r.slotMinutes,
          capacity: r.capacity,
          active: r.active,
        })),
        exceptions: exceptions.map((e) => ({
          date: format(e.date, "yyyy-MM-dd"),
          closed: e.closed,
          overrideCapacity: e.overrideCapacity,
        })),
        existingBookings,
      },
      pricing: { id: pricing.id },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Scheduling load failed: ${message}` };
  }
}

/**
 * Compute available slots for the given context (date range).
 * Uses getAvailableSlots from slots.ts.
 */
export function computeAvailableSlots(context: InquirySchedulingContext, maxResults = 200) {
  return getAvailableSlots({
    fromISO: context.effectiveFrom,
    toISO: context.toISO,
    durationMinutes: context.durationMinutes,
    rules: context.rules,
    exceptions: context.exceptions,
    existingBookings: context.existingBookings,
    tz: TZ,
    maxResults,
  });
}

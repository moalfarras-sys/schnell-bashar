import { NextResponse } from "next/server";
import { z } from "zod";
import { addDays, eachDayOfInterval, format, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { prisma } from "@/server/db/prisma";
import { getAvailableSlots } from "@/server/availability/slots";

export const runtime = "nodejs";

const querySchema = z.object({
  speed: z.enum(["ECONOMY", "STANDARD", "EXPRESS"]),
  from: z.string(),
  to: z.string(),
  durationMinutes: z.coerce.number().int().min(60).max(24 * 60),
});

function leadDaysForSpeed(speed: "ECONOMY" | "STANDARD" | "EXPRESS", pricing: any) {
  switch (speed) {
    case "ECONOMY":
      return pricing.economyLeadDays as number;
    case "EXPRESS":
      return pricing.expressLeadDays as number;
    default:
      return pricing.standardLeadDays as number;
  }
}

function getDemoSlots(fromISO: string, toISO: string, durationMinutes: number) {
  const start = parseISO(fromISO);
  const end = parseISO(toISO);
  const days = eachDayOfInterval({ start, end });
  const results: { start: string; end: string }[] = [];
  for (const day of days) {
    if (day.getDay() === 0) continue;
    for (let h = 8; h <= 18 - Math.ceil(durationMinutes / 60); h++) {
      const s = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, 0, 0, 0);
      const e = new Date(s.getTime() + durationMinutes * 60_000);
      results.push({ start: s.toISOString(), end: e.toISOString() });
    }
    if (results.length > 200) break;
  }
  return results;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage", details: parsed.error.flatten() }, { status: 400 });
  }

  const { speed, from, to, durationMinutes } = parsed.data;

  try {
    const pricing = await prisma.pricingConfig.findFirst({
      where: { active: true },
      orderBy: { updatedAt: "desc" },
    });
    if (!pricing) {
      return NextResponse.json({
        effectiveFrom: from,
        to,
        slots: getDemoSlots(from, to, durationMinutes),
        demoMode: true,
      });
    }

    const leadDays = leadDaysForSpeed(speed, pricing);

    const fromISO = from.length > 10 ? format(parseISO(from), "yyyy-MM-dd") : from;
    const toISO = to.length > 10 ? format(parseISO(to), "yyyy-MM-dd") : to;

    const todayISO = formatInTimeZone(new Date(), "Europe/Berlin", "yyyy-MM-dd");
    const earliestISO = format(addDays(parseISO(todayISO), Math.max(0, leadDays)), "yyyy-MM-dd");
    const effectiveFrom = fromISO < earliestISO ? earliestISO : fromISO;

    const rules = await prisma.availabilityRule.findMany({ where: { active: true } });
    const exceptions = await prisma.availabilityException.findMany();

    if (rules.length === 0) {
      console.warn("[GET /api/slots] No availability rules configured, using demo slots");
      return NextResponse.json({
        effectiveFrom,
        to: toISO,
        slots: getDemoSlots(effectiveFrom, toISO, durationMinutes),
        demoMode: true,
      });
    }

    const startDay = parseISO(effectiveFrom);
    const endDay = parseISO(toISO);
    const start = fromZonedTime(
      new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate(), 0, 0, 0, 0),
      "Europe/Berlin",
    );
    const end = fromZonedTime(
      new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate(), 23, 59, 59, 999),
      "Europe/Berlin",
    );
    const bookings = await prisma.order.findMany({
      where: {
        slotStart: { lt: end },
        slotEnd: { gt: start },
        status: { not: "CANCELLED" },
      },
      select: { slotStart: true, slotEnd: true },
    });

    const slots = getAvailableSlots({
      fromISO: effectiveFrom,
      toISO,
      durationMinutes,
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
      existingBookings: bookings.map((b) => ({ start: b.slotStart, end: b.slotEnd })),
    });

    return NextResponse.json({
      effectiveFrom,
      to: toISO,
      slots: slots.map((s) => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[GET /api/slots]", err);
    return NextResponse.json({
      effectiveFrom: from,
      to,
      slots: getDemoSlots(from, to, durationMinutes),
      demoMode: true,
    });
  }
}


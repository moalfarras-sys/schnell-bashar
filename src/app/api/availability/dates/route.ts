import { NextResponse } from "next/server";
import { z } from "zod";
import { addDays, format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import {
  loadInquirySchedulingContext,
  computeAvailableSlots,
} from "@/server/availability/inquiry-scheduling";

export const runtime = "nodejs";

const MAX_RANGE_DAYS = 365;
const TZ = "Europe/Berlin";

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  speed: z.enum(["ECONOMY", "STANDARD", "EXPRESS"]),
  serviceType: z.enum(["UMZUG", "ENTSORGUNG", "KOMBI"]).optional(),
  volumeM3: z.coerce.number().min(0.1).max(500),
});

/** Generate demo dates when database is unavailable (Mon–Sat for next 60 days). */
function getDemoAvailableDates(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = parseISO(from);
  const end = parseISO(to);
  let d = new Date(start);
  while (d <= end && dates.length < 120) {
    const dow = d.getDay();
    if (dow >= 1 && dow <= 6) {
      dates.push(format(d, "yyyy-MM-dd"));
    }
    d = addDays(d, 1);
  }
  return dates;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ungültige Anfrage", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { from, to, speed, volumeM3 } = parsed.data;

    const fromDate = parseISO(from);
    const toDate = parseISO(to);
    if (fromDate > toDate) {
      return NextResponse.json(
        { error: "from must be before or equal to to" },
        { status: 400 },
      );
    }

    const daysDiff = Math.floor((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));
    if (daysDiff > MAX_RANGE_DAYS) {
      return NextResponse.json(
        { error: `Date range must not exceed ${MAX_RANGE_DAYS} days` },
        { status: 400 },
      );
    }

    const loaded = await loadInquirySchedulingContext({
      speed,
      volumeM3,
      fromISO: from,
      toISO: to,
    });

    if ("error" in loaded) {
      console.warn("[GET /api/availability/dates] DB unavailable, using demo dates:", loaded.error);
      const demoDates = getDemoAvailableDates(from, to);
      return NextResponse.json({
        availableDates: demoDates,
        effectiveFrom: from,
        to,
        demoMode: true,
      });
    }

    const hasRules = loaded.context.rules.length > 0;
    if (!hasRules) {
      console.warn("[GET /api/availability/dates] No availability rules configured, using demo dates");
      const demoDates = getDemoAvailableDates(from, to);
      return NextResponse.json({
        availableDates: demoDates,
        effectiveFrom: loaded.context.effectiveFrom,
        to: loaded.context.toISO,
        demoMode: true,
      });
    }

    if (loaded.context.effectiveFrom > loaded.context.toISO) {
      return NextResponse.json({
        availableDates: [],
        effectiveFrom: loaded.context.effectiveFrom,
        to: loaded.context.toISO,
      });
    }

    const slots = computeAvailableSlots(loaded.context, 500);
    const dateSet = new Set<string>();
    for (const s of slots) {
      const iso = formatInTimeZone(s.start, TZ, "yyyy-MM-dd");
      dateSet.add(iso);
    }
    let availableDates = Array.from(dateSet).sort();
    if (availableDates.length === 0) {
      availableDates = getDemoAvailableDates(from, to);
    }

    return NextResponse.json({
      availableDates,
      effectiveFrom: loaded.context.effectiveFrom,
      to: loaded.context.toISO,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/availability/dates]", err);
    const { from, to } = Object.fromEntries(new URL(req.url).searchParams.entries());
    if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      const demoDates = getDemoAvailableDates(from, to);
      return NextResponse.json({
        availableDates: demoDates,
        effectiveFrom: from,
        to,
        demoMode: true,
      });
    }
    return NextResponse.json(
      { error: "Availability check failed", details: message },
      { status: 500 },
    );
  }
}

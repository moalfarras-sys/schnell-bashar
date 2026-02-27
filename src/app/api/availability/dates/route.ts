import { NextResponse } from "next/server";
import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { z } from "zod";

import { computeAvailableSlots, loadInquirySchedulingContext } from "@/server/availability/inquiry-scheduling";

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
        { error: "Der Starttag muss vor oder gleich dem Endtag liegen." },
        { status: 400 },
      );
    }

    const daysDiff = Math.floor((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));
    if (daysDiff > MAX_RANGE_DAYS) {
      return NextResponse.json(
        { error: `Der Zeitraum darf maximal ${MAX_RANGE_DAYS} Tage umfassen.` },
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
      return NextResponse.json(
        {
          error:
            "Die Live-Verfügbarkeit ist aktuell nicht erreichbar. Bitte versuchen Sie es in wenigen Minuten erneut.",
          details: loaded.error,
        },
        { status: 503 },
      );
    }

    if (loaded.context.rules.length === 0) {
      return NextResponse.json(
        {
          error:
            "Es sind keine Verfügbarkeitsregeln hinterlegt. Bitte kontaktieren Sie den Support.",
        },
        { status: 503 },
      );
    }

    if (loaded.context.effectiveFrom > loaded.context.toISO) {
      return NextResponse.json({
        availableDates: [],
        effectiveFrom: loaded.context.effectiveFrom,
        to: loaded.context.toISO,
        mode: "live",
      });
    }

    const slots = computeAvailableSlots(loaded.context, 500);
    const dateSet = new Set<string>();
    for (const slot of slots) {
      dateSet.add(formatInTimeZone(slot.start, TZ, "yyyy-MM-dd"));
    }

    return NextResponse.json({
      availableDates: Array.from(dateSet).sort(),
      effectiveFrom: loaded.context.effectiveFrom,
      to: loaded.context.toISO,
      mode: "live",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[GET /api/availability/dates] strict-live failed", error);
    return NextResponse.json(
      {
        error: "Die Verfügbarkeit konnte nicht live geladen werden.",
        details: message,
      },
      { status: 503 },
    );
  }
}

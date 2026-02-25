import { NextResponse } from "next/server";
import { z } from "zod";
import { formatInTimeZone } from "date-fns-tz";

import {
  loadInquirySchedulingContext,
  computeAvailableSlots,
} from "@/server/availability/inquiry-scheduling";

export const runtime = "nodejs";

const TZ = "Europe/Berlin";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  speed: z.enum(["ECONOMY", "STANDARD", "EXPRESS"]),
  serviceType: z.enum(["UMZUG", "ENTSORGUNG", "KOMBI"]).optional(),
  volumeM3: z.coerce.number().min(0).max(500).transform((v) => Math.max(0.1, v || 1)),
});

/** Generate demo time slots (08:00–18:00, hourly). Same shape as production: { start, end, label }. */
function getDemoSlots(dateStr: string): { start: string; end: string; label: string }[] {
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = new Date(y, m - 1, d);
  if (day.getDay() === 0) return [];
  const slots: { start: string; end: string; label: string }[] = [];
  for (let h = 8; h < 18; h++) {
    const start = new Date(y, m - 1, d, h, 0, 0, 0);
    const end = new Date(y, m - 1, d, h + 1, 0, 0, 0);
    slots.push({
      start: start.toISOString(),
      end: end.toISOString(),
      label: `${String(h).padStart(2, "0")}:00 – ${String(h + 1).padStart(2, "0")}:00`,
    });
  }
  return slots;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Anfrage", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { date, speed, volumeM3 } = parsed.data;

  try {
    const loaded = await loadInquirySchedulingContext({
      speed,
      volumeM3,
      fromISO: date,
      toISO: date,
    });

    if ("error" in loaded) {
      console.warn("[GET /api/availability/slots] DB unavailable, using demo slots:", loaded.error);
      const demoSlots = getDemoSlots(date);
      return NextResponse.json({
        date,
        durationMinutes: 90,
        slots: demoSlots,
        mode: "demo",
        demoMode: true,
        message:
          "Live-Zeitfenster sind aktuell nicht erreichbar. Es werden vorübergehend Ersatz-Zeitfenster angezeigt.",
      });
    }

    const hasRules = loaded.context.rules.length > 0;
    if (!hasRules) {
      console.warn("[GET /api/availability/slots] No availability rules configured, using demo slots");
      const demoSlots = getDemoSlots(date);
      return NextResponse.json({
        date,
        durationMinutes: 90,
        slots: demoSlots,
        mode: "demo",
        demoMode: true,
        message:
          "Für diesen Zeitraum sind keine Live-Zeitfenster hinterlegt. Es werden Ersatz-Zeitfenster angezeigt.",
      });
    }

    const computed = computeAvailableSlots(loaded.context, 80);
    const slotsWithLabels =
      computed.length > 0
        ? computed.map((s) => ({
            start: s.start.toISOString(),
            end: s.end.toISOString(),
            label: formatInTimeZone(s.start, TZ, "HH:mm") + " – " + formatInTimeZone(s.end, TZ, "HH:mm"),
          }))
        : getDemoSlots(date);

    if (computed.length === 0) {
      console.warn("[GET /api/availability/slots] computed slots empty, using demo for date=", date);
    }

    return NextResponse.json({
      date,
      durationMinutes: loaded.context.durationMinutes ?? 90,
      slots: slotsWithLabels,
      mode: "live",
    });
  } catch (err) {
    console.error("[GET /api/availability/slots]", err);
    const demoSlots = getDemoSlots(date);
    return NextResponse.json({
      date,
      durationMinutes: 90,
      slots: demoSlots,
      mode: "demo",
      demoMode: true,
      message:
        "Die Zeitfenster konnten nicht live geladen werden. Es werden Ersatz-Zeitfenster angezeigt.",
    });
  }
}


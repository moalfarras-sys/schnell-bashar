import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { z } from "zod";

import { computeAvailableSlots, loadInquirySchedulingContext } from "@/server/availability/inquiry-scheduling";

export const runtime = "nodejs";

const TZ = "Europe/Berlin";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  speed: z.enum(["ECONOMY", "STANDARD", "EXPRESS"]),
  serviceType: z.enum(["UMZUG", "ENTSORGUNG", "KOMBI"]).optional(),
  volumeM3: z.coerce.number().min(0).max(500).transform((v) => Math.max(0.1, v || 1)),
});

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
      return NextResponse.json(
        {
          error:
            "Die Live-Zeitfenster sind aktuell nicht erreichbar. Bitte versuchen Sie es erneut.",
          details: loaded.error,
        },
        { status: 503 },
      );
    }

    if (loaded.context.rules.length === 0) {
      return NextResponse.json(
        {
          error:
            "Es sind keine Zeitfenster-Regeln hinterlegt. Bitte kontaktieren Sie den Support.",
        },
        { status: 503 },
      );
    }

    const computed = computeAvailableSlots(loaded.context, 80);
    const slots = computed.map((slot) => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      label: `${formatInTimeZone(slot.start, TZ, "HH:mm")} – ${formatInTimeZone(slot.end, TZ, "HH:mm")}`,
    }));

    return NextResponse.json({
      date,
      durationMinutes: loaded.context.durationMinutes ?? 90,
      slots,
      mode: "live",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[GET /api/availability/slots] strict-live failed", error);
    return NextResponse.json(
      {
        error: "Die Zeitfenster konnten nicht live geladen werden.",
        details: message,
      },
      { status: 503 },
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { addDays, eachDayOfInterval, format } from "date-fns";

import {
  findZoneByPostalCode,
  loadCalendarConfig,
  type CalendarServiceType,
} from "@/server/calendar/config-store";

const querySchema = z.object({
  postalCode: z.string().trim().regex(/^\d{5}$/),
  serviceType: z.enum(["MOVING", "MONTAGE", "ENTSORGUNG"]).default("MOVING"),
  from: z.string().optional(),
  days: z.coerce.number().int().min(1).max(60).default(30),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    postalCode: url.searchParams.get("postalCode"),
    serviceType: url.searchParams.get("serviceType") ?? "MOVING",
    from: url.searchParams.get("from") ?? undefined,
    days: url.searchParams.get("days") ?? "30",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrageparameter." }, { status: 400 });
  }

  const { zones, rules, exceptions } = await loadCalendarConfig();
  const zone = findZoneByPostalCode(zones, parsed.data.postalCode);
  if (!zone) {
    return NextResponse.json({ ok: true, slots: [], note: "Kein aktives Gebiet gefunden." });
  }

  const start = parsed.data.from ? new Date(parsed.data.from) : new Date();
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "Ungültiges Startdatum." }, { status: 400 });
  }
  const end = addDays(start, parsed.data.days);
  const days = eachDayOfInterval({ start, end });

  const serviceType = parsed.data.serviceType as CalendarServiceType;
  const zoneRules = rules.filter(
    (r) =>
      r.active &&
      r.zoneId === zone.id &&
      r.serviceType === serviceType,
  );

  const slots = days
    .flatMap((d) => {
      const weekday = d.getDay();
      const dateKey = format(d, "yyyy-MM-dd");
      const blocked = exceptions.find(
        (e) =>
          e.closed &&
          e.date === dateKey &&
          (!e.zoneId || e.zoneId === zone.id) &&
          (!e.serviceType || e.serviceType === serviceType),
      );
      if (blocked) return [];

      return zoneRules
        .filter((r) => r.weekday === weekday)
        .map((r) => ({
          date: dateKey,
          from: r.from,
          to: r.to,
          serviceType,
          zone: zone.name,
        }));
    })
    .slice(0, 120);

  return NextResponse.json({
    ok: true,
    zone: { id: zone.id, name: zone.name },
    serviceType,
    slots,
    note:
      "Kalenderdaten sind Planungswerte. Finale Bestätigung erfolgt durch unser Team.",
  });
}

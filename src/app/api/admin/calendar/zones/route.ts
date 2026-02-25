import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminPermission } from "@/server/auth/require-admin";
import {
  loadCalendarConfig,
  saveCalendarZones,
} from "@/server/calendar/config-store";

const zoneSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(2).max(120),
  postalCodes: z.array(z.string().trim().regex(/^\d{5}$/)).min(1),
  active: z.boolean().default(true),
});

export async function GET() {
  const auth = await requireAdminPermission("availability.read");
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const { zones } = await loadCalendarConfig();
  return NextResponse.json({ zones });
}

export async function POST(req: Request) {
  const auth = await requireAdminPermission("availability.update");
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = z.object({ zones: z.array(zoneSchema).min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Zonen-Daten.", details: parsed.error.flatten() }, { status: 400 });
  }

  const zones = await saveCalendarZones(parsed.data.zones);
  return NextResponse.json({ ok: true, zones });
}

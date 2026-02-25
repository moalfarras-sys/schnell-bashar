import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminPermission } from "@/server/auth/require-admin";
import {
  loadCalendarConfig,
  saveCalendarRules,
} from "@/server/calendar/config-store";

const ruleSchema = z.object({
  id: z.string().trim().min(1),
  zoneId: z.string().trim().min(1),
  serviceType: z.enum(["MOVING", "MONTAGE", "ENTSORGUNG"]),
  weekday: z.number().int().min(0).max(6),
  from: z.string().regex(/^\d{2}:\d{2}$/),
  to: z.string().regex(/^\d{2}:\d{2}$/),
  active: z.boolean().default(true),
});

export async function GET() {
  const auth = await requireAdminPermission("availability.read");
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const { rules } = await loadCalendarConfig();
  return NextResponse.json({ rules });
}

export async function POST(req: Request) {
  const auth = await requireAdminPermission("availability.update");
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = z.object({ rules: z.array(ruleSchema).min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Regel-Daten.", details: parsed.error.flatten() }, { status: 400 });
  }

  const rules = await saveCalendarRules(parsed.data.rules);
  return NextResponse.json({ ok: true, rules });
}

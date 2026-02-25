import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminPermission } from "@/server/auth/require-admin";
import {
  loadCalendarConfig,
  saveCalendarExceptions,
} from "@/server/calendar/config-store";

const exceptionSchema = z.object({
  id: z.string().trim().min(1),
  zoneId: z.string().trim().optional(),
  serviceType: z.enum(["MOVING", "MONTAGE", "ENTSORGUNG"]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  closed: z.boolean().default(true),
  note: z.string().trim().max(240).optional(),
});

export async function GET() {
  const auth = await requireAdminPermission("availability.read");
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const { exceptions } = await loadCalendarConfig();
  return NextResponse.json({ exceptions });
}

export async function POST(req: Request) {
  const auth = await requireAdminPermission("availability.update");
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = z
    .object({ exceptions: z.array(exceptionSchema) })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Ausnahme-Daten.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const exceptions = await saveCalendarExceptions(parsed.data.exceptions);
  return NextResponse.json({ ok: true, exceptions });
}

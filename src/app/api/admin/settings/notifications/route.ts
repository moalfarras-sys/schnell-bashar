import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/server/auth/require-admin";
import {
  loadOperationalSettings,
  saveOperationalSettings,
} from "@/server/settings/operational-settings";

const settingsSchema = z.object({
  internalOrderEmailEnabled: z.boolean(),
  customerConfirmationEmailEnabled: z.boolean(),
  whatsappEnabled: z.boolean(),
  whatsappPhoneE164: z.string().trim().min(8).max(24),
  whatsappTemplate: z.string().trim().min(10).max(500),
  supportPhone: z.string().trim().min(6).max(60),
  supportEmail: z.string().trim().email().max(160),
});

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const settings = await loadOperationalSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabe", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const saved = await saveOperationalSettings(parsed.data);
  return NextResponse.json({ ok: true, settings: saved });
}

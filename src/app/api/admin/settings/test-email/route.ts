import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminPermission } from "@/server/auth/require-admin";
import { getDefaultFrom, isEmailConfigured, sendEmail } from "@/server/email/mailer";

export const runtime = "nodejs";

const bodySchema = z.object({
  to: z.string().email().optional(),
});

export async function POST(req: Request) {
  const auth = await requireAdminPermission("settings.update");
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: "Nicht autorisiert." }, { status: 401 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "SMTP ist nicht vollständig konfiguriert.",
      },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Bitte eine gültige E-Mail eingeben." }, { status: 400 });
  }

  const to = parsed.data.to || process.env.ORDER_RECEIVER_EMAIL || process.env.SMTP_USER;
  if (!to) {
    return NextResponse.json({ ok: false, error: "Keine Zieladresse konfiguriert." }, { status: 400 });
  }

  const result = await sendEmail({
    from: getDefaultFrom(),
    to,
    subject: "SMTP-Test - Schnell Sicher Umzug",
    text: "Die SMTP-Konfiguration funktioniert. Diese Test-E-Mail wurde aus dem Adminbereich gesendet.",
    html: "<p>Die SMTP-Konfiguration funktioniert. Diese Test-E-Mail wurde aus dem Adminbereich gesendet.</p>",
  });

  if (!result.success) {
    return NextResponse.json(
      { ok: false, error: result.error || "Test-E-Mail konnte nicht gesendet werden." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: `Test-E-Mail wurde an ${to} gesendet.`,
  });
}

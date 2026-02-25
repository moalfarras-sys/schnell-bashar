import { NextRequest, NextResponse } from "next/server";
import { sendEmail, isEmailConfigured, getDefaultFrom } from "@/server/email/mailer";

/**
 * POST /api/test-email
 * Body: { "to": "your@email.com" }
 * Sends a test email to verify SMTP configuration.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "In der Produktionsumgebung nicht verfügbar" }, { status: 403 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: "SMTP nicht konfiguriert. Bitte SMTP_HOST, SMTP_USER und SMTP_PASS in .env setzen.",
        configured: false,
      },
      { status: 503 },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const to = body?.to || process.env.ORDER_RECEIVER_EMAIL || process.env.SMTP_USER;

    if (!to || typeof to !== "string") {
      return NextResponse.json(
        { error: "Bitte 'to' im Anfragekörper angeben, z. B. { \"to\": \"your@email.com\" }" },
        { status: 400 },
      );
    }

    const result = await sendEmail({
      from: getDefaultFrom(),
      to,
      subject: "Test-E-Mail – Schnell Sicher Umzug",
      text: "Dies ist eine Test-E-Mail. Die SMTP-Konfiguration funktioniert.",
      html: "<p>Dies ist eine Test-E-Mail. Die SMTP-Konfiguration funktioniert.</p>",
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test-E-Mail wurde an ${to} gesendet`,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: result.error,
        configured: true,
      },
      { status: 500 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[test-email]", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}


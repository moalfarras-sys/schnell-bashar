import { NextResponse } from "next/server";
import { z } from "zod";

import { getMailer } from "@/server/email/mailer";
import { isRateLimited, requestIp } from "@/lib/spam-protection";

export const runtime = "nodejs";

const contactSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(180),
  phone: z.string().min(6).max(40).optional(),
  message: z.string().min(5).max(1500),
  volumeM3: z.number().min(0).max(500).optional(),
  serviceType: z.string().max(80).optional(),
  source: z.enum(["contact_page", "booking_fallback"]).default("contact_page"),
  website: z.string().max(200).optional(),
});

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Eingabedaten.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data.website?.trim()) {
    return NextResponse.json({ error: "Spam erkannt." }, { status: 400 });
  }

  const ip = requestIp(req);
  if (isRateLimited(`contact:${ip}`, 4, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte später erneut versuchen." },
      { status: 429 },
    );
  }

  const mailer = getMailer();
  const to = process.env.ORDER_RECEIVER_EMAIL || process.env.SMTP_USER;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!mailer || !to || !from) {
    return NextResponse.json(
      {
        error:
          "E-Mail-Versand ist aktuell nicht konfiguriert. Bitte rufen Sie uns an: +49 172 9573681.",
      },
      { status: 503 },
    );
  }

  const { name, email, phone, message, volumeM3, serviceType, source } = parsed.data;
  const sourceLabel = source === "booking_fallback" ? "Buchungsformular (Rückfall)" : "Kontaktformular";

  const subject = `Neue Anfrage (${sourceLabel}) - ${name}`;
  const text = [
    `Quelle: ${sourceLabel}`,
    `Name: ${name}`,
    `E-Mail: ${email}`,
    `Telefon: ${phone || "-"}`,
    `Leistung: ${serviceType || "-"}`,
    `Kubikmeter: ${typeof volumeM3 === "number" ? `${volumeM3} m³` : "-"}`,
    "",
    "Nachricht:",
    message,
  ].join("\n");

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2>Neue Anfrage (${escapeHtml(sourceLabel)})</h2>
      <p>
        <b>Name:</b> ${escapeHtml(name)}<br/>
        <b>E-Mail:</b> ${escapeHtml(email)}<br/>
        <b>Telefon:</b> ${escapeHtml(phone || "-")}<br/>
        <b>Leistung:</b> ${escapeHtml(serviceType || "-")}<br/>
        <b>Kubikmeter:</b> ${typeof volumeM3 === "number" ? `${volumeM3} m³` : "-"}
      </p>
      <p><b>Nachricht:</b><br/>${escapeHtml(message).replaceAll("\n", "<br/>")}</p>
    </div>
  `;

  await mailer.sendMail({
    to,
    from,
    subject,
    text,
    html,
    replyTo: email,
  });

  return NextResponse.json({ ok: true });
}


import { formatInTimeZone } from "date-fns-tz";

import { getMailer } from "@/server/email/mailer";

export async function sendScheduleConfirmationEmail(args: {
  publicId: string;
  customerName: string;
  customerEmail: string;
  slotStart: Date;
  slotEnd: Date;
  note?: string | null;
}) {
  const transporter = getMailer();
  if (!transporter) return { ok: false as const, skipped: true as const };

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from || !args.customerEmail) return { ok: false as const, skipped: true as const };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://schnellsicherumzug.de";
  const slotLabel = `${formatInTimeZone(args.slotStart, "Europe/Berlin", "EEEE, dd.MM.yyyy")} ${formatInTimeZone(args.slotStart, "Europe/Berlin", "HH:mm")} - ${formatInTimeZone(args.slotEnd, "Europe/Berlin", "HH:mm")} Uhr`;
  const subject = `Termin bestätigt – Anfrage ${args.publicId}`;

  const text = [
    `Hallo ${args.customerName},`,
    "",
    "Ihr Termin wurde bestätigt.",
    `Termin: ${slotLabel}`,
    "",
    args.note ? `Hinweis: ${args.note}` : "",
    "",
    `Anfrage verfolgen: ${baseUrl}/anfrage/${args.publicId}`,
    "",
    "Mit freundlichen Grüßen",
    "Schnell Sicher Umzug",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; max-width: 600px; margin: 0 auto; color: #1e293b;">
      <h2 style="margin:0 0 16px;">Termin bestätigt</h2>
      <p>Hallo <strong>${args.customerName}</strong>,</p>
      <p>Ihr Termin wurde bestätigt.</p>
      <p><strong>Termin:</strong> ${slotLabel}</p>
      ${args.note ? `<p><strong>Hinweis:</strong> ${args.note}</p>` : ""}
      <p><a href="${baseUrl}/anfrage/${args.publicId}" style="color:#2563eb;">Anfrage verfolgen</a></p>
      <p>Mit freundlichen Grüßen<br/>Schnell Sicher Umzug</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      to: args.customerEmail,
      from,
      replyTo: process.env.ORDER_RECEIVER_EMAIL || from,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error("[sendScheduleConfirmationEmail] Failed:", err);
    return { ok: false as const, skipped: false as const };
  }

  return { ok: true as const };
}


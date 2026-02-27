import { formatInTimeZone } from "date-fns-tz";

import { getMailer } from "@/server/email/mailer";
import { generateQuotePdf } from "@/server/pdf/generate-quote";

type EmailItemRow = {
  name: string;
  qty: number;
  isDisposal: boolean;
  lineVolumeM3: number;
};

function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
}

function preferredTimeWindowLabel(value: "MORNING" | "AFTERNOON" | "EVENING" | "FLEXIBLE") {
  if (value === "MORNING") return "Vormittag";
  if (value === "AFTERNOON") return "Nachmittag";
  if (value === "EVENING") return "Abend";
  return "Flexibel";
}

export async function sendCustomerConfirmationEmail(args: {
  publicId: string;
  customerEmail: string;
  customerName: string;
  serviceType: string;
  speed: string;
  requestedDateFrom: Date;
  requestedDateTo: Date;
  preferredTimeWindow: "MORNING" | "AFTERNOON" | "EVENING" | "FLEXIBLE";
  priceMinCents: number;
  priceMaxCents: number;
  totalVolumeM3: number;
  itemRows: EmailItemRow[];
  quoteId?: string | null;
  offerNo?: string;
  offerLink?: string;
  supportPhone: string;
  supportEmail: string;
  whatsappPhoneE164: string;
}) {
  const transporter = getMailer();
  if (!transporter) return { ok: false as const, skipped: true as const };

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from || !args.customerEmail) return { ok: false as const, skipped: true as const };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://schnellsicherumzug.de";

  const timingLabel =
    `${formatInTimeZone(args.requestedDateFrom, "Europe/Berlin", "dd.MM.yyyy")} bis ` +
    `${formatInTimeZone(args.requestedDateTo, "Europe/Berlin", "dd.MM.yyyy")} (${preferredTimeWindowLabel(args.preferredTimeWindow)})`;

  const serviceLabel =
    args.serviceType === "MOVING"
      ? "Umzug"
      : args.serviceType === "DISPOSAL"
        ? "Entsorgung"
        : "Umzug + Entsorgung";

  const speedLabel =
    args.speed === "ECONOMY" ? "Economy" : args.speed === "EXPRESS" ? "Express" : "Standard";

  const subject = `Ihre Anfrage ${args.publicId} – Bestätigung von Schnell Sicher Umzug`;

  const waUrl = `https://wa.me/${args.whatsappPhoneE164}`;
  const telHref = `tel:${args.supportPhone.replace(/\s+/g, "")}`;

  const text = [
    `Hallo ${args.customerName},`,
    "",
    `vielen Dank für Ihre Anfrage bei Schnell Sicher Umzug!`,
    "",
    `Hier sind Ihre Angaben im Überblick:`,
    "",
    `Auftrags-ID: ${args.publicId}`,
    args.quoteId ? `Quote-ID: ${args.quoteId}` : "",
    `Leistung: ${serviceLabel}`,
    `Priorität: ${speedLabel}`,
    `Wunschtermin: ${timingLabel}`,
    `Status: Termin angefragt`,
    args.offerNo ? `Angebotsnummer: ${args.offerNo}` : "",
    args.offerLink ? `Angebot öffnen: ${args.offerLink}` : "",
    `Volumen: ca. ${args.totalVolumeM3} m³`,
    `Preisrahmen: ${eur(args.priceMinCents)} – ${eur(args.priceMaxCents)}`,
    "",
    `Wir prüfen Ihre Anfrage und melden uns schnellstmöglich.`,
    "",
    `Sie können den Status Ihrer Anfrage jederzeit unter folgendem Link einsehen:`,
    `${baseUrl}/anfrage/${args.publicId}`,
    "",
    `Bei Fragen erreichen Sie uns:`,
    `Telefon: ${args.supportPhone}`,
    `WhatsApp: ${waUrl}`,
    `E-Mail: ${args.supportEmail}`,
    "",
    `Im Anhang finden Sie Ihr vorläufiges Angebot als PDF.`,
    "",
    `Mit freundlichen Grüßen`,
    `Ihr Team von Schnell Sicher Umzug`,
  ].join("\n");

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
      <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px 24px; border-radius: 16px 16px 0 0;">
        <h1 style="margin: 0; color: white; font-size: 22px; font-weight: 800;">Schnell Sicher Umzug</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">Ihre Anfrage wurde erfolgreich gesendet</p>
      </div>

      <div style="background: #ffffff; padding: 32px 24px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="margin: 0 0 16px; font-size: 15px;">Hallo <strong>${args.customerName}</strong>,</p>
        <p style="margin: 0 0 24px; font-size: 14px; color: #475569; line-height: 1.6;">
          vielen Dank für Ihre Anfrage! Wir haben Ihre Daten erhalten und prüfen diese.
          Sie erhalten in Kürze eine Rückmeldung von uns.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Auftrags-ID</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #1e293b;">${args.publicId}</td>
            </tr>
            ${args.quoteId ? `<tr><td style="padding: 6px 0; color: #64748b;">Quote-ID</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1e293b;">${args.quoteId}</td></tr>` : ""}
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Leistung</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1e293b;">${serviceLabel}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Priorität</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1e293b;">${speedLabel}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Wunschtermin</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1e293b;">${timingLabel}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Status</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1e293b;">Termin angefragt</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Volumen</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #1e293b;">ca. ${args.totalVolumeM3} m³</td>
            </tr>
            <tr style="border-top: 1px solid #e2e8f0;">
              <td style="padding: 10px 0 6px; color: #64748b; font-weight: 700;">Preisrahmen</td>
              <td style="padding: 10px 0 6px; text-align: right; font-weight: 800; color: #2563eb; font-size: 16px;">${eur(args.priceMinCents)} – ${eur(args.priceMaxCents)}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${baseUrl}/anfrage/${args.publicId}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none;">
            Anfrage verfolgen
          </a>
        </div>
        ${args.offerLink ? `<p style="margin:0 0 16px; font-size:13px;"><strong>Angebot:</strong> <a href="${args.offerLink}" style="color:#2563eb;">Jetzt öffnen und bestätigen</a></p>` : ""}

        <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">
          Im Anhang finden Sie Ihr vorläufiges Angebot als PDF-Dokument.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

        <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
          <strong>Kontakt:</strong><br/>
          Telefon: <a href="${telHref}" style="color: #2563eb;">${args.supportPhone}</a><br/>
          WhatsApp: <a href="${waUrl}" style="color: #2563eb;">Chat öffnen</a><br/>
          E-Mail: <a href="mailto:${args.supportEmail}" style="color: #2563eb;">${args.supportEmail}</a>
        </p>
      </div>

      <div style="background: #f8fafc; padding: 16px 24px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
          © ${new Date().getFullYear()} Schnell Sicher Umzug  Anzengruber Straße 9, 12043 Berlin
        </p>
      </div>
    </div>
  `;

  const netCents = args.priceMaxCents;
  const vatCents = Math.round(netCents * 0.19);
  const grossCents = netCents + vatCents;

  const quotePdf = await generateQuotePdf({
    publicId: args.publicId,
    customerName: args.customerName,
    customerEmail: args.customerEmail,
    serviceType: args.serviceType,
    speed: args.speed,
    slotLabel: `Anfragezeitraum: ${timingLabel}`,
    lines: args.itemRows.map((r) => ({
      label: r.name,
      qty: r.qty,
      unit: Math.round((r.lineVolumeM3 / Math.max(r.qty, 1)) * 100),
      total: Math.round((args.priceMaxCents / Math.max(args.itemRows.length, 1)) * 1),
    })),
    netCents,
    vatCents,
    grossCents,
  });

  try {
    await transporter.sendMail({
      to: args.customerEmail,
      from,
      replyTo: process.env.ORDER_RECEIVER_EMAIL || from,
      subject,
      text,
      html,
      attachments: [
        {
          filename: `${args.publicId}-angebot.pdf`,
          content: quotePdf,
          contentType: "application/pdf",
        },
      ],
    });
  } catch (err) {
    console.error("[sendCustomerConfirmationEmail] Failed:", err);
    return { ok: false as const, skipped: false as const };
  }

  return { ok: true as const };
}





import { format } from "date-fns";
import { de } from "date-fns/locale";

import { sendEmail, getDefaultFrom } from "./mailer";

interface SendOfferEmailParams {
  customerName: string;
  customerEmail: string;
  offerId: string;
  offerNo?: string;
  offerLink: string;
  agbLink?: string;
  validUntil: Date;
  pdfBuffer?: Buffer;
  agbBuffer?: Buffer;
}

export async function sendOfferEmail(
  params: SendOfferEmailParams,
): Promise<{ success: boolean; error?: string }> {
  const {
    customerName,
    customerEmail,
    offerId,
    offerNo,
    offerLink,
    agbLink,
    validUntil,
    pdfBuffer,
    agbBuffer,
  } = params;

  const lastName = customerName.split(" ").pop() || customerName;
  const validUntilFormatted = format(validUntil, "dd.MM.yyyy", { locale: de });

  const subject = "Ihr Umzugsangebot \u2013 Schnell Sicher Umzug";

  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.7; color: #334155; background-color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: #ffffff; padding: 32px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .content { padding: 36px 30px; }
    .content p { margin: 0 0 16px 0; color: #475569; font-size: 15px; }
    .validity { background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px 18px; margin: 24px 0; border-radius: 0 6px 6px 0; font-size: 14px; color: #1e3a8a; }
    .cta-wrapper { text-align: center; margin: 28px 0; }
    .cta-button { display: inline-block; background: #059669; color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; letter-spacing: 0.3px; }
    .fallback-link { display: block; margin-top: 10px; font-size: 12px; color: #64748b; word-break: break-all; }
    .signature { margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .signature p { margin: 4px 0; font-size: 14px; color: #64748b; }
    .signature .name { font-weight: 600; color: #1e3a8a; }
    .footer { background: #f1f5f9; padding: 24px 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    .footer p { margin: 4px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Schnell Sicher Umzug</h1>
    </div>
    <div class="content">
      <p>Sehr geehrte/r Frau/Herr ${lastName},</p>

      <p>vielen Dank f\u00FCr Ihre Anfrage. Anbei erhalten Sie Ihr individuelles Umzugsangebot (PDF) sowie unsere AGB.</p>

      <div class="validity">
        Das Angebot ist g\u00FCltig bis <strong>${validUntilFormatted}</strong>.
      </div>

      <p>Sie k\u00F6nnen das Angebot direkt online verbindlich annehmen:</p>

      <div class="cta-wrapper">
        <a href="${offerLink}" class="cta-button">Angebot verbindlich annehmen</a>
        <span class="fallback-link">${offerLink}</span>
      </div>

      <div class="signature">
        <p>Mit freundlichen Gr\u00FC\u00DFen</p>
        <p class="name">Schnell Sicher Umzug</p>
        <p>Tel.: +49 172 9573681</p>
        <p>kontakt@schnellsicherumzug.de</p>
      </div>
    </div>
    <div class="footer">
      <p>Schnell Sicher Umzug</p>
      <p>Anzengruber Stra\u00DFe 9, 12043 Berlin &middot; USt-IdNr.: DE454603297</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `Sehr geehrte/r Frau/Herr ${lastName},

vielen Dank f\u00FCr Ihre Anfrage. Anbei erhalten Sie Ihr individuelles Umzugsangebot (PDF) sowie unsere AGB.

Das Angebot ist g\u00FCltig bis ${validUntilFormatted}.

Sie k\u00F6nnen das Angebot direkt online verbindlich annehmen:
${offerLink}

Mit freundlichen Gr\u00FC\u00DFen
Schnell Sicher Umzug
Tel.: +49 172 9573681
kontakt@schnellsicherumzug.de`;

  const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];

  if (pdfBuffer) {
    attachments.push({
      filename: `Angebot-${offerNo || offerId}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    });
  }

  if (agbBuffer) {
    attachments.push({
      filename: "AGB-Schnell-Sicher-Umzug.pdf",
      content: agbBuffer,
      contentType: "application/pdf",
    });
  }

  const result = await sendEmail({
    from: getDefaultFrom(),
    to: customerEmail,
    subject,
    text: text.trim(),
    html,
    attachments,
  });

  if (!result.success) {
    console.error("[sendOfferEmail] Failed:", result.error);
  }
  return result;
}

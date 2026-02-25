import { getDefaultFrom, sendEmail } from "./mailer";

interface SendSigningEmailParams {
  customerName: string;
  customerEmail: string;
  signingLink?: string | null;
  provider?: "DOCUSIGN" | "INTERNAL";
  contractPdfUrl?: string | null;
}

export async function sendSigningEmail(
  params: SendSigningEmailParams,
): Promise<{ success: boolean; error?: string }> {
  const {
    customerName,
    customerEmail,
    signingLink = null,
    provider = "DOCUSIGN",
    contractPdfUrl = null,
  } = params;

  if (provider === "INTERNAL" && !signingLink) {
    return {
      success: false,
      error: "Interner Signatur-Link fehlt.",
    };
  }

  const lastName = customerName.split(" ").pop() || customerName;

  const subject =
    provider === "INTERNAL"
      ? "Bitte unterschreiben Sie Ihren Umzugsvertrag (Online-Link) - Schnell Sicher Umzug"
      : "Ihr Umzugsvertrag wurde über DocuSign zur Unterschrift versendet - Schnell Sicher Umzug";

  const internalLinkBlock =
    provider === "INTERNAL"
      ? `
      <p>Bitte unterschreiben Sie Ihren Umzugsvertrag digital über den folgenden sicheren Link:</p>
      <div class="cta-wrapper">
        <a href="${signingLink}" class="cta-button">Vertrag online unterschreiben</a>
        <span class="fallback-link">${signingLink}</span>
      </div>
    `
      : "";

  const docusignInfoBlock =
    provider === "DOCUSIGN"
      ? `
      <div class="note">
        Der Vertrag wurde an DocuSign übergeben. Bitte öffnen Sie die separate E-Mail von DocuSign und folgen Sie den Schritten zur Unterschrift.
      </div>
      ${
        signingLink
          ? `<p>Falls bereits ein direkter Link vorliegt, können Sie alternativ diesen verwenden:</p><span class="fallback-link">${signingLink}</span>`
          : ""
      }
    `
      : "";

  const backupBlock =
    provider === "INTERNAL"
      ? `
      <div class="note">
        Falls der Signatur-Link nicht funktioniert, nutzen Sie bitte den PDF-Backup:
        ${
          contractPdfUrl
            ? `<br><a href="${contractPdfUrl}">Vertrag als PDF öffnen</a>`
            : "<br>Antworten Sie auf diese E-Mail, wir senden Ihnen den Vertrag erneut."
        }
      </div>
    `
      : "";

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
    .cta-wrapper { text-align: center; margin: 28px 0; }
    .cta-button { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; letter-spacing: 0.3px; }
    .fallback-link { display: block; margin-top: 10px; font-size: 12px; color: #64748b; word-break: break-all; }
    .note { background: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 18px; margin: 24px 0; border-radius: 0 6px 6px 0; font-size: 13px; color: #1e3a8a; }
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

      <p>vielen Dank für die Annahme unseres Angebots.</p>

      ${internalLinkBlock}
      ${docusignInfoBlock}

      <div class="note">
        Nach erfolgreicher Unterzeichnung erhalten Sie automatisch eine Kopie des unterschriebenen Vertrags per E-Mail.
      </div>

      ${backupBlock}

      <div class="signature">
        <p>Mit freundlichen Grüßen</p>
        <p class="name">Schnell Sicher Umzug</p>
        <p>Tel.: +49 172 9573681</p>
        <p>kontakt@schnellsicherumzug.de</p>
      </div>
    </div>
    <div class="footer">
      <p>Schnell Sicher Umzug</p>
      <p>Anzengruber Straße 9, 12043 Berlin &middot; USt-IdNr.: DE454603297</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `Sehr geehrte/r Frau/Herr ${lastName},

vielen Dank für die Annahme unseres Angebots.
${
  provider === "INTERNAL"
    ? `Bitte unterschreiben Sie Ihren Umzugsvertrag digital über den folgenden sicheren Link:\n\n${signingLink}\n`
    : "Der Vertrag wurde an DocuSign übergeben. Bitte öffnen Sie die separate E-Mail von DocuSign und folgen Sie den Schritten zur Unterschrift."
}

Nach erfolgreicher Unterzeichnung erhalten Sie automatisch eine Kopie des unterschriebenen Vertrags per E-Mail.
${
  provider === "INTERNAL"
    ? `\nFallback-Hinweis: Falls der Link nicht funktioniert, ${
        contractPdfUrl
          ? `nutzen Sie dieses PDF: ${contractPdfUrl}`
          : "antworten Sie bitte auf diese E-Mail für einen manuellen Versand."
      }\n`
    : ""
}

Mit freundlichen Grüßen
Schnell Sicher Umzug
Tel.: +49 172 9573681
kontakt@schnellsicherumzug.de`;

  const result = await sendEmail({
    from: getDefaultFrom(),
    to: customerEmail,
    subject,
    text,
    html,
  });

  if (!result.success) {
    console.error("[sendSigningEmail] Failed:", result.error);
  }

  return result;
}



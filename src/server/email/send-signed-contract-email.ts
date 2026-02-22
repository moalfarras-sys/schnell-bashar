import { sendEmail, getDefaultFrom } from "./mailer";

interface SendSignedContractEmailParams {
  customerName: string;
  customerEmail: string;
  contractId: string;
  pdfBuffer: Buffer;
}

export async function sendSignedContractEmail(
  params: SendSignedContractEmailParams,
): Promise<{ success: boolean; error?: string }> {
  const { customerName, customerEmail, contractId, pdfBuffer } = params;

  const lastName = customerName.split(" ").pop() || customerName;

  const subject = "Ihr unterschriebener Umzugsvertrag \u2013 Schnell Sicher Umzug";

  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.7; color: #334155; background-color: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; padding: 32px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .content { padding: 36px 30px; }
    .content p { margin: 0 0 16px 0; color: #475569; font-size: 15px; }
    .success-box { background: #ecfdf5; border-left: 4px solid #059669; padding: 14px 18px; margin: 24px 0; border-radius: 0 6px 6px 0; font-size: 14px; color: #065f46; }
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

      <p>vielen Dank. Ihr Umzugsvertrag wurde erfolgreich unterschrieben.</p>

      <div class="success-box">
        Anbei erhalten Sie eine Kopie des unterschriebenen Vertrags als PDF.
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

vielen Dank. Ihr Umzugsvertrag wurde erfolgreich unterschrieben.
Anbei erhalten Sie eine Kopie des unterschriebenen Vertrags als PDF.

Mit freundlichen Gr\u00FC\u00DFen
Schnell Sicher Umzug
Tel.: +49 172 9573681
kontakt@schnellsicherumzug.de`;

  const result = await sendEmail({
    from: getDefaultFrom(),
    to: customerEmail,
    subject,
    text,
    html,
    attachments: [
      {
        filename: `Vertrag-${contractId}-unterzeichnet.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  if (!result.success) {
    console.error("[sendSignedContractEmail] Failed:", result.error);
  }
  return result;
}

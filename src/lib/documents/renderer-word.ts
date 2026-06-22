import type { DocumentVersionSnapshot } from "@/lib/documents/types";
import { formatGermanCurrency, formatGermanDate } from "@/lib/documents/formatting";

export function renderDocumentWord(input: {
  type: "ANGEBOT" | "RECHNUNG" | "AUFTRAG_VERTRAG" | "MAHNUNG" | "AGB_APPENDIX";
  number: string;
  snapshot: DocumentVersionSnapshot;
}): Buffer {
  const { snapshot, type, number } = input;

  const date = formatGermanDate(snapshot.serviceData?.serviceDate || new Date().toISOString());
  const customerName = snapshot.customerData.name || "Kunde";
  const customerAddress = snapshot.customerData.billingAddress?.replace(/\n/g, "<br>") || "";

  const titleMap = {
    ANGEBOT: "ANGEBOT",
    RECHNUNG: "RECHNUNG",
    AUFTRAG_VERTRAG: "AUFTRAG / VERTRAG",
    MAHNUNG: "MAHNUNG",
    AGB_APPENDIX: "AGB",
  };

  const title = titleMap[type] || "DOKUMENT";

  let lineItemsHtml = "";
  snapshot.lineItems.forEach((item) => {
    lineItemsHtml += `
      <tr>
        <td style="padding: 10px; vertical-align: top;">
          <strong>${item.title || ""}</strong>
          ${item.description ? `<br><span style="color: #666; font-size: 0.9em;">${item.description}</span>` : ""}
        </td>
        <td style="padding: 10px; text-align: center; vertical-align: top;">${item.quantity} ${item.unit}</td>
        <td style="padding: 10px; text-align: right; vertical-align: top;">${formatGermanCurrency(item.totalNetCents)}</td>
      </tr>
    `;
  });

  const isContract = type === "AUFTRAG_VERTRAG";

  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8"><title>${title}</title></head>
    <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; font-size: 11pt;">
      
      <table style="width: 100%; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 20px;">
        <tr>
          <td style="vertical-align: top;">
            <h1 style="color: #163f6f; margin: 0; font-size: 24pt;">${title}</h1>
            <p style="margin: 5px 0 0 0; font-weight: bold;">Schnell Sicher Umzug</p>
            <p style="margin: 0; color: #4b5563; font-size: 9pt;">Anzengruber Straße 9 · 12043 Berlin</p>
            <p style="margin: 0; color: #4b5563; font-size: 9pt;">+49 172 9573681 · kontakt@schnellsicherumzug.de</p>
          </td>
          <td style="text-align: right; vertical-align: top;">
            <img src="https://schnellsicherumzug.de/media/brand/hero-logo.jpeg" alt="Schnell Sicher Umzug Logo" width="170" />
            <div style="margin-top: 10px;">
              <strong>Nr:</strong> ${number}<br>
              <strong>Datum:</strong> ${date}
            </div>
          </td>
        </tr>
      </table>

      <table style="width: 100%; margin-bottom: 30px;">
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <div style="border: 1px solid #d9dde4; border-radius: 8px; padding: 10px;">
              <h3 style="margin: 0 0 8px 0; font-size: 10pt; color: #111827;">Kunde</h3>
              <strong>${customerName}</strong><br>
              ${customerAddress}
            </div>
          </td>
          <td style="width: 50%; vertical-align: top; padding-left: 15px;">
            ${snapshot.addressData?.fromAddress ? `
            <div style="border: 1px solid #d9dde4; border-radius: 8px; padding: 10px;">
              <h3 style="margin: 0 0 8px 0; font-size: 10pt; color: #111827;">Details</h3>
              Von: ${snapshot.addressData.fromAddress}<br>
              Nach: ${snapshot.addressData.toAddress || "-"}
            </div>
            ` : ""}
          </td>
        </tr>
      </table>

      ${snapshot.visibleNotes ? `<p style="margin-bottom: 20px;">${snapshot.visibleNotes.replace(/\n/g, "<br>")}</p>` : ""}

      <table border="1" style="width: 100%; border-collapse: collapse; border-color: #e5e7eb; margin-bottom: 20px;">
        <tr style="background-color: #f3f4f6;">
          <th style="padding: 10px; text-align: left;">Leistung</th>
          <th style="padding: 10px; text-align: center;">Menge</th>
          <th style="padding: 10px; text-align: right;">Netto</th>
        </tr>
        ${lineItemsHtml}
      </table>
      
      <table style="width: 100%; max-width: 300px; margin-left: auto; margin-bottom: 40px;">
        <tr>
          <td style="padding: 4px 0;">Netto</td>
          <td style="padding: 4px 0; text-align: right;">${formatGermanCurrency(snapshot.subtotalCents)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">MwSt. (19%)</td>
          <td style="padding: 4px 0; text-align: right;">${formatGermanCurrency(snapshot.taxCents)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-top: 1px solid #d1d5db; font-weight: bold;">Gesamtbetrag</td>
          <td style="padding: 8px 0; border-top: 1px solid #d1d5db; font-weight: bold; text-align: right;">${formatGermanCurrency(snapshot.grossCents)}</td>
        </tr>
      </table>

      ${isContract ? `
      <h3 style="color: #163f6f; margin-top: 40px; font-size: 14pt;">Elektronische Bestätigung</h3>
      <table style="width: 100%; margin-top: 20px;">
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <p style="color: #6f7f92; font-size: 0.9em; margin-bottom: 10px;">AUFTRAGNEHMER</p>
            <div style="height: 80px;">
              <img src="https://schnellsicherumzug.de/media/brand/company-stamp-clean.png" alt="Company Stamp" width="170" />
            </div>
            <div style="border-top: 1px solid #111827; padding-top: 5px; margin-top: 10px;">
              <p style="margin: 0; font-weight: bold;">Schnell Sicher Umzug</p>
              <p style="margin: 0; color: #6f7f92; font-size: 0.8em;">Berlin, Ort / Datum</p>
            </div>
          </td>
          <td style="width: 50%; vertical-align: top; padding-left: 20px;">
            <p style="color: #6f7f92; font-size: 0.9em; margin-bottom: 10px;">AUFTRAGGEBER</p>
            <div style="height: 80px;">
            </div>
            <div style="border-top: 1px solid #111827; padding-top: 5px; margin-top: 10px;">
              <p style="margin: 0; font-weight: bold;">${customerName}</p>
              <p style="margin: 0; color: #6f7f92; font-size: 0.8em;">Ort / Datum</p>
            </div>
          </td>
        </tr>
      </table>
      ` : ""}
    </body>
    </html>
  `;

  return Buffer.from(htmlContent, "utf-8");
}

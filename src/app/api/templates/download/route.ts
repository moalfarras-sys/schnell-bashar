import { NextRequest, NextResponse } from "next/server";
import { generateContractPDF } from "@/server/pdf/generate-contract";
import { generateInvoicePDF } from "@/server/pdf/generate-invoice";
import { generateOfferPDF } from "@/server/pdf/generate-offer";
import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const format = url.searchParams.get("format");

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(adminCookieName())?.value;
    if (!token) return new NextResponse("Unauthorized", { status: 401 });
    await verifyAdminToken(token);
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    let pdfBuffer: Buffer;

    if (type === "contract") {
      pdfBuffer = await generateContractPDF({
        contractId: "TEMPLATE",
        contractNo: "[Vertragsnummer]",
        offerNo: "[Angebotsnummer]",
        orderNo: "[Auftragsnummer]",
        contractDate: new Date(),
        customerName: "[Kundenname]",
        customerAddress: "[Kundenadresse]",
        customerPhone: "[Telefon]",
        customerEmail: "[E-Mail]",
        moveFrom: "[Startadresse]",
        moveTo: "[Zieladresse]",
        moveDate: new Date(),
        services: [
          { name: "[Leistung 1]", quantity: 1, unit: "Pauschal" },
          { name: "[Leistung 2]", quantity: 1, unit: "Stück" },
        ],
        netCents: 100000,
        vatCents: 19000,
        grossCents: 119000,
      });
    } else if (type === "invoice") {
      pdfBuffer = await generateInvoicePDF({
        invoiceId: "TEMPLATE",
        invoiceNo: "[Rechnungsnummer]",
        orderNo: "[Auftragsnummer]",
        issuedAt: new Date(),
        dueAt: new Date(Date.now() + 14 * 86400000),
        customerName: "[Kundenname]",
        address: "[Kundenadresse]",
        customerPhone: "[Telefon]",
        customerEmail: "[E-Mail]",
        lineItems: [
          { name: "[Leistung 1]", quantity: 1, unit: "Pauschal", priceCents: 80000 },
          { name: "[Leistung 2]", quantity: 2, unit: "Stück", priceCents: 20000 },
        ],
        netCents: 100000,
        vatCents: 19000,
        grossCents: 119000,
        paidCents: 0,
      });
    } else {
      pdfBuffer = await generateOfferPDF({
        offerId: "TEMPLATE",
        offerNo: "[Angebotsnummer]",
        orderNo: "[Auftragsnummer]",
        offerDate: new Date(),
        validUntil: new Date(Date.now() + 14 * 86400000),
        customerName: "[Kundenname]",
        customerAddress: "[Kundenadresse]",
        customerPhone: "[Telefon]",
        customerEmail: "[E-Mail]",
        services: [
          { name: "[Leistung 1]", quantity: 1, unit: "Pauschal", priceCents: 80000 },
          { name: "[Leistung 2]", quantity: 2, unit: "Stück", priceCents: 20000 },
        ],
        netCents: 100000,
        vatCents: 19000,
        grossCents: 119000,
      });
    }

    if (format === "word") {
      // Basic fallback: Return HTML saved as .doc so Word opens it and user can edit it
      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset="utf-8"><title>Template</title></head>
        <body style="font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="text-align: right; margin-bottom: 20px;">
            <img src="https://schnellsicherumzug.de/media/brand/hero-logo.jpeg" alt="Schnell Sicher Umzug Logo" width="170" />
          </div>
          <h1 style="color: #163f6f;">Schnell Sicher Umzug - ${(type || "template").toUpperCase()}</h1>
          <table style="width: 100%; margin-bottom: 20px;">
            <tr>
              <td><strong>Kunde:</strong> [Kundenname]</td>
              <td style="text-align: right;"><strong>Datum:</strong> [Datum]</td>
            </tr>
            <tr>
              <td><strong>Adresse:</strong> [Kundenadresse]</td>
              <td style="text-align: right;"><strong>Nr:</strong> [Nummer]</td>
            </tr>
          </table>
          
          <table border="1" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="background-color: #f8fbfd;">
              <th style="padding: 10px; text-align: left;">Leistung</th>
              <th style="padding: 10px; text-align: center;">Menge</th>
              <th style="padding: 10px; text-align: right;">Preis</th>
            </tr>
            <tr>
              <td style="padding: 10px;">[Leistung 1]</td>
              <td style="padding: 10px; text-align: center;">1</td>
              <td style="padding: 10px; text-align: right;">[Preis]</td>
            </tr>
          </table>
          
          <div style="text-align: right; font-size: 1.2em; margin-bottom: 40px;">
            <strong>Gesamtbetrag: [Gesamtbetrag]</strong>
          </div>

          ${
            type === "contract"
              ? `
          <h3 style="color: #163f6f; margin-top: 40px;">Unterschriften</h3>
          <table style="width: 100%; margin-top: 20px;">
            <tr>
              <td style="width: 50%; vertical-align: top;">
                <p style="color: #6f7f92; font-size: 0.9em; margin-bottom: 10px;">AUFTRAGNEHMER</p>
                <div style="height: 80px;">
                  <img src="https://schnellsicherumzug.de/media/brand/company-stamp-clean.png" alt="Company Stamp" width="170" />
                </div>
                <div style="border-top: 1px solid #d7e1eb; padding-top: 5px; margin-top: 10px;">
                  <p style="margin: 0;">Schnell Sicher Umzug</p>
                  <p style="margin: 0; color: #6f7f92; font-size: 0.8em;">Berlin, [Datum]</p>
                </div>
              </td>
              <td style="width: 50%; vertical-align: top; padding-left: 20px;">
                <p style="color: #6f7f92; font-size: 0.9em; margin-bottom: 10px;">AUFTRAGGEBER</p>
                <div style="height: 80px;">
                  <!-- Signatur Kunde -->
                </div>
                <div style="border-top: 1px solid #d7e1eb; padding-top: 5px; margin-top: 10px;">
                  <p style="margin: 0;">[Kundenname]</p>
                  <p style="margin: 0; color: #6f7f92; font-size: 0.8em;">[Datum]</p>
                </div>
              </td>
            </tr>
          </table>
          `
              : ""
          }
        </body>
        </html>
      `;
      return new NextResponse(htmlContent, {
        headers: {
          "Content-Type": "application/msword",
          "Content-Disposition": `attachment; filename="Template_${type}.doc"`,
        },
      });
    }

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Template_${type}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Template generation error:", error);
    return new NextResponse("Error generating template", { status: 500 });
  }
}

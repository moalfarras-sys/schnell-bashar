import PDFDocument from "pdfkit";
import path from "path";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { existsSync } from "fs";
import { getImageSlot, publicSrcToAbsolute } from "@/server/content/slots";

export interface InvoiceData {
  invoiceId: string;
  invoiceNo?: string;
  issuedAt: Date;
  dueAt: Date;

  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  address?: string;

  description?: string;
  lineItems?: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    priceCents?: number;
  }>;

  netCents: number;
  vatCents: number;
  grossCents: number;
  paidCents: number;

  contractNo?: string;
  offerNo?: string;
  orderNo?: string;
}

function eur(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function fmtDate(date: Date): string {
  return format(date, "dd.MM.yyyy", { locale: de });
}

const BLUE = "#1e3a8a";
const DARK = "#0f172a";
const BODY = "#334155";
const MUTED = "#64748b";
const LIGHT_BG = "#f8fafc";
const BORDER = "#e2e8f0";
const ACCENT = "#2563eb";

const TOP_M = 44;
const M = 50;
const W = 595;
const H = 842;
const LEFT = M;
const RIGHT = W - M;
const CW = RIGHT - LEFT;
const FOOTER_H = 52;
const SAFE_BOTTOM = H - M - FOOTER_H - 10;

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const logoSlot = await getImageSlot({
    key: "img.pdf.brand.logo",
    fallbackSrc: "/media/brand/hero-logo.jpeg",
  });
  const slotLogoPath = publicSrcToAbsolute(logoSlot.src);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      bufferPages: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      info: {
        Title: `Rechnung ${data.invoiceNo || data.invoiceId}`,
        Author: "Schnell Sicher Umzug",
        Subject: "Rechnung",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let y = TOP_M;

    function ensureSpace(need: number) {
      if (y + need > SAFE_BOTTOM) {
        doc.addPage();
        y = TOP_M;
      }
    }

    function sectionHeading(label: string) {
      ensureSpace(24);
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(BLUE);
      doc.text(label.toUpperCase(), LEFT, y, { width: CW, characterSpacing: 0.8 });
      y += 13;
      doc.strokeColor(ACCENT).lineWidth(0.5).moveTo(LEFT, y).lineTo(LEFT + 36, y).stroke();
      y += 7;
    }

    function labelValue(label: string, value: string, x: number, w: number) {
      doc.font("Helvetica").fontSize(7).fillColor(MUTED);
      doc.text(label, x, y, { width: w });
      y += 8;
      doc.font("Helvetica").fontSize(9).fillColor(DARK);
      doc.text(value, x, y, { width: w });
      y += 12;
    }

    const LOGO_W = 150;
    const INFO_FONT = 8.5;
    const INFO_BOLD_FONT = 9.5;
    const INFO_LINE_H = 11;
    const logoPath =
      slotLogoPath ??
      path.join(process.cwd(), "public", "media", "brand", "hero-logo.jpeg");

    const companyLines = [
      { text: "Schnell Sicher Umzug", bold: true },
      { text: "Anzengruber Stra\u00DFe 9, 12043 Berlin", bold: false },
      { text: "Tel.: +49 172 9573681", bold: false },
      { text: "kontakt@schnellsicherumzug.de", bold: false },
      { text: "USt-IdNr.: DE454603297", bold: false },
    ];
    const infoBlockH = companyLines.length * INFO_LINE_H;
    const headerBlockH = Math.max(LOGO_W, infoBlockH);

    if (existsSync(logoPath)) {
      try {
        doc.image(logoPath, LEFT, y, { width: LOGO_W });
      } catch {
        doc.font("Helvetica-Bold").fontSize(15).fillColor(BLUE);
        doc.text("SSU", LEFT, y + 12);
      }
    } else {
      doc.font("Helvetica-Bold").fontSize(13).fillColor(BLUE);
      doc.text("Schnell Sicher Umzug", LEFT, y + 12);
    }

    let cy = y;
    for (const line of companyLines) {
      const fs = line.bold ? INFO_BOLD_FONT : INFO_FONT;
      doc
        .font(line.bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(fs)
        .fillColor(line.bold ? DARK : MUTED);
      doc.text(line.text, LEFT, cy, { width: CW, align: "right" });
      cy += INFO_LINE_H;
    }

    y += headerBlockH + 14;
    doc.strokeColor(BLUE).lineWidth(1.5).moveTo(LEFT, y).lineTo(RIGHT, y).stroke();
    y += 20;

    doc.font("Helvetica-Bold").fontSize(20).fillColor(DARK);
    doc.text("RECHNUNG", LEFT, y, { width: CW, align: "center" });
    y += 26;

    const refParts = [`Nr. ${data.invoiceNo || data.invoiceId}`];
    if (data.contractNo) refParts.push(`Vertrag: ${data.contractNo}`);
    if (data.offerNo) refParts.push(`Angebot: ${data.offerNo}`);
    if (data.orderNo) refParts.push(`Auftrag: ${data.orderNo}`);
    refParts.push(`Datum: ${fmtDate(data.issuedAt)}`);
    refParts.push(`F\u00E4llig: ${fmtDate(data.dueAt)}`);

    doc.font("Helvetica").fontSize(8.5).fillColor(MUTED);
    doc.text(refParts.join("  \u00B7  "), LEFT, y, { width: CW, align: "center" });
    y += 16;

    sectionHeading("Rechnungsempf\u00E4nger");
    const colW = Math.floor(CW / 2) - 8;
    const savedY = y;

    labelValue("Name", data.customerName, LEFT, colW);
    if (data.address) {
      labelValue("Adresse", data.address, LEFT, colW);
    }
    const leftEnd = y;
    y = savedY;
    if (data.customerPhone) {
      labelValue("Telefon", data.customerPhone, LEFT + colW + 16, colW);
    }
    labelValue("E-Mail", data.customerEmail, LEFT + colW + 16, colW);
    y = Math.max(leftEnd, y) + 4;

    if (data.description) {
      sectionHeading("Beschreibung");
      doc.font("Helvetica").fontSize(9).fillColor(BODY);
      doc.text(data.description, LEFT, y, { width: CW });
      y += doc.heightOfString(data.description, { width: CW }) + 8;
    }

    const items = data.lineItems ?? [];
    if (items.length > 0) {
      ensureSpace(30 + items.length * 14);
      sectionHeading("Positionen");

      const hasPrice = items.some((s) => s.priceCents !== undefined);
      items.forEach((s, i) => {
        ensureSpace(16);
        const qty = s.quantity ? `  \u00B7  ${s.quantity} ${s.unit || "St\u00FCck"}` : "";
        const priceStr =
          hasPrice && s.priceCents !== undefined ? `   ${eur(s.priceCents)}` : "";
        doc.font("Helvetica").fontSize(9).fillColor(BODY);
        doc.text(`${i + 1}.  ${s.name}${qty}`, LEFT + 4, y, {
          width: CW - 4 - (hasPrice ? 90 : 0),
        });
        if (priceStr) {
          doc.text(priceStr, LEFT + 4, y, { width: CW - 4, align: "right" });
        }
        y += 14;
      });
      y += 6;
    }

    const outstanding = data.grossCents - data.paidCents;
    const priceCardH = data.paidCents > 0 ? 104 : 84;
    ensureSpace(priceCardH + 28);
    sectionHeading("Betrag");

    const pad = 14;
    const innerW = CW - pad * 2;

    doc.save();
    doc.roundedRect(LEFT, y, CW, priceCardH, 6).fill(LIGHT_BG);
    doc
      .roundedRect(LEFT, y, CW, priceCardH, 6)
      .strokeColor(BORDER)
      .lineWidth(0.75)
      .stroke();
    doc.restore();

    let priceY = y + pad;
    doc.font("Helvetica").fontSize(9).fillColor(BODY);
    doc.text("Nettobetrag:", LEFT + pad, priceY);
    doc.text(eur(data.netCents), LEFT + pad, priceY, { width: innerW, align: "right" });

    priceY += 20;
    doc.text("MwSt. (19%):", LEFT + pad, priceY);
    doc.text(eur(data.vatCents), LEFT + pad, priceY, { width: innerW, align: "right" });

    priceY += 16;
    doc
      .strokeColor(BORDER)
      .lineWidth(0.5)
      .moveTo(LEFT + pad, priceY)
      .lineTo(RIGHT - pad, priceY)
      .stroke();
    priceY += 8;

    doc.font("Helvetica-Bold").fontSize(11).fillColor(DARK);
    doc.text("Gesamtbetrag (brutto):", LEFT + pad, priceY);
    doc.text(eur(data.grossCents), LEFT + pad, priceY, { width: innerW, align: "right" });

    if (data.paidCents > 0) {
      priceY += 20;
      doc.font("Helvetica").fontSize(9).fillColor(BODY);
      doc.text("Bereits bezahlt:", LEFT + pad, priceY);
      doc.text(eur(data.paidCents), LEFT + pad, priceY, {
        width: innerW,
        align: "right",
      });

      priceY += 14;
      doc.font("Helvetica-Bold").fontSize(10).fillColor(outstanding > 0 ? "#dc2626" : "#16a34a");
      doc.text("Offener Betrag:", LEFT + pad, priceY);
      doc.text(eur(outstanding), LEFT + pad, priceY, { width: innerW, align: "right" });
    }

    y += priceCardH + 10;

    ensureSpace(36);
    doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);
    doc.text(
      "Bitte \u00FCberweisen Sie den Betrag innerhalb der Zahlungsfrist auf das unten angegebene Konto.",
      LEFT,
      y,
      { width: CW },
    );
    y += 10;
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(BODY);
    doc.text(
      "Bankverbindung: Berliner Sparkasse  \u00B7  Kontoinhaber: Baschar Al Hasan  \u00B7  IBAN: DE75 1005 0000 0191 5325 76  \u00B7  BIC: BELADEBEXXX",
      LEFT,
      y,
      { width: CW },
    );

    function drawFooter() {
      const fy = H - M - FOOTER_H;
      doc
        .strokeColor(BORDER)
        .lineWidth(0.5)
        .moveTo(LEFT, fy)
        .lineTo(RIGHT, fy)
        .stroke();

      const fy1 = fy + 8;
      doc.font("Helvetica").fontSize(6.5).fillColor(MUTED);
      doc.text(
        "Schnell Sicher Umzug  \u00B7  Anzengruber Stra\u00DFe 9, 12043 Berlin  \u00B7  Tel.: +49 172 9573681  \u00B7  USt-IdNr.: DE454603297",
        LEFT,
        fy1,
        { width: CW, align: "center" },
      );
      doc.text(
        "Bankverbindung: Berliner Sparkasse  \u00B7  Kontoinhaber: Baschar Al Hasan  \u00B7  IBAN: DE75 1005 0000 0191 5325 76  \u00B7  BIC: BELADEBEXXX",
        LEFT,
        fy1 + 10,
        { width: CW, align: "center" },
      );
    }

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      drawFooter();
    }

    doc.end();
  });
}

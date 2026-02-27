import PDFDocument from "pdfkit";
import path from "path";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { existsSync } from "fs";
import { getImageSlot, publicSrcToAbsolute } from "@/server/content/slots";
import { sanitizePdfText } from "@/server/pdf/layout";

export interface OfferData {
  offerId: string;
  offerNo?: string;
  orderNo?: string;
  offerDate: Date;
  validUntil: Date;

  customerName: string;
  customerAddress?: string;
  customerPhone: string;
  customerEmail: string;

  moveFrom?: string;
  moveTo?: string;
  moveDate?: Date;
  moveTime?: string;
  floorFrom?: number;
  floorTo?: number;
  elevatorFrom?: boolean;
  elevatorTo?: boolean;
  notes?: string;

  volumeM3?: number;
  speed?: string;
  serviceType?: string;
  needNoParkingZone?: boolean;
  addons?: string[];
  checklist?: string[];

  services: Array<{
    name: string;
    description?: string;
    quantity?: number;
    unit?: string;
    priceCents?: number;
  }>;

  netCents: number;
  vatCents: number;
  grossCents: number;

  logoPath?: string;
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

function speedLabel(speed?: string): string {
  if (speed === "ECONOMY") return "Economy";
  if (speed === "EXPRESS") return "Express";
  return "Standard";
}

function serviceTypeLabel(type?: string): string {
  if (type === "ENTSORGUNG") return "Entsorgung";
  if (type === "KOMBI") return "Umzug + Entsorgung";
  return "Umzug";
}

export async function generateOfferPDF(data: OfferData): Promise<Buffer> {
  let slotLogoPath: string | null = null;
  try {
    const logoSlot = await getImageSlot({
      key: "img.pdf.brand.logo",
      fallbackSrc: "/media/brand/hero-logo.jpeg",
    });
    slotLogoPath = publicSrcToAbsolute(logoSlot.src);
  } catch {
    slotLogoPath = null;
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      bufferPages: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      info: {
        Title: `Angebot ${data.offerId}`,
        Author: "Schnell Sicher Umzug",
        Subject: "Umzugsangebot",
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
      const cleanLabel = sanitizePdfText(label);
      const cleanValue = sanitizePdfText(value);
      const lineGap = 1.3;
      doc.font("Helvetica").fontSize(7).fillColor(MUTED);
      doc.text(cleanLabel, x, y, { width: w, lineGap });
      const labelHeight = doc.heightOfString(cleanLabel || " ", { width: w, lineGap });
      y += labelHeight + 3;
      doc.font("Helvetica").fontSize(9).fillColor(DARK);
      doc.text(cleanValue, x, y, { width: w, lineGap });
      const valueHeight = doc.heightOfString(cleanValue || " ", { width: w, lineGap });
      y += valueHeight + 4;
    }

    // HEADER
    const LOGO_W = 150;
    const INFO_FONT = 8.5;
    const INFO_BOLD_FONT = 9.5;
    const INFO_LINE_H = 11;
    const logoPath = slotLogoPath ?? path.join(process.cwd(), "public", "media", "brand", "hero-logo.jpeg");

    const companyLines = [
      { text: "Schnell Sicher Umzug", bold: true },
      { text: "Anzengruber Stra\u00DFe 9, 12043 Berlin", bold: false },
      { text: "Tel.: +49 172 9573681", bold: false },
      { text: "kontakt@schnellsicherumzug.de", bold: false },
      { text: "USt-IdNr.: DE454603297", bold: false },
    ];
    const infoBlockH = companyLines.length * INFO_LINE_H;
    const headerBlockH = Math.max(LOGO_W, infoBlockH);

    // top-align logo
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

    // top-align company info (same y as logo)
    let cy = y;
    for (const line of companyLines) {
      const fs = line.bold ? INFO_BOLD_FONT : INFO_FONT;
      doc.font(line.bold ? "Helvetica-Bold" : "Helvetica").fontSize(fs).fillColor(line.bold ? DARK : MUTED);
      doc.text(sanitizePdfText(line.text), LEFT, cy, { width: CW, align: "right" });
      cy += INFO_LINE_H;
    }

    y += headerBlockH + 14;

    doc.strokeColor(BLUE).lineWidth(1.5).moveTo(LEFT, y).lineTo(RIGHT, y).stroke();
    y += 20;

    // TITLE
    doc.font("Helvetica-Bold").fontSize(20).fillColor(DARK);
    doc.text("ANGEBOT", LEFT, y, { width: CW, align: "center" });
    y += 26;

    doc.font("Helvetica").fontSize(8.5).fillColor(MUTED);
    doc.text(
      `Nr. ${data.offerNo || data.offerId}${data.orderNo ? `  ·  Auftrag: ${data.orderNo}` : ""}  \u00B7  Datum: ${fmtDate(data.offerDate)}  \u00B7  G\u00FCltig bis: ${fmtDate(data.validUntil)}`,
      LEFT, y, { width: CW, align: "center" },
    );
    y += 16;

    // KUNDENANGABEN
    sectionHeading("Kundenangaben");

    const colW = Math.floor(CW / 2) - 8;
    const savedY = y;

    labelValue("Name", data.customerName, LEFT, colW);
    if (data.customerAddress) {
      labelValue("Adresse", data.customerAddress, LEFT, colW);
    }
    const leftColEnd = y;

    y = savedY;
    labelValue("Telefon", data.customerPhone, LEFT + colW + 16, colW);
    labelValue("E-Mail", data.customerEmail, LEFT + colW + 16, colW);
    const rightColEnd = y;

    y = Math.max(leftColEnd, rightColEnd) + 4;

    // UMZUGSDETAILS
    sectionHeading("Umzugsdetails");

    const savedY2 = y;

    if (data.moveFrom) {
      const floor =
        data.floorFrom != null
          ? ` (${data.floorFrom}. OG${data.elevatorFrom ? ", Aufzug" : ""})`
          : "";
      labelValue("Von", data.moveFrom + floor, LEFT, colW);
    }
    if (data.moveDate) {
      const time = data.moveTime ? `, ${data.moveTime} Uhr` : "";
      labelValue("Termin", fmtDate(data.moveDate) + time, LEFT, colW);
    }
    if (data.serviceType) {
      labelValue("Leistungsart", serviceTypeLabel(data.serviceType), LEFT, colW);
    }
    if (data.volumeM3 !== undefined && data.volumeM3 > 0) {
      labelValue("Volumen", `${data.volumeM3} m\u00B3`, LEFT, colW);
    }
    const leftEnd2 = y;

    y = savedY2;
    if (data.moveTo) {
      const floor =
        data.floorTo != null
          ? ` (${data.floorTo}. OG${data.elevatorTo ? ", Aufzug" : ""})`
          : "";
      labelValue("Nach", data.moveTo + floor, LEFT + colW + 16, colW);
    }
    if (data.speed) {
      labelValue("Priorität", speedLabel(data.speed), LEFT + colW + 16, colW);
    }
    if (data.needNoParkingZone) {
      labelValue("Halteverbotszone", "Ja, wird ben\u00F6tigt", LEFT + colW + 16, colW);
    }
    const rightEnd2 = y;

    y = Math.max(leftEnd2, rightEnd2);

    if (data.addons && data.addons.length > 0) {
      doc.font("Helvetica").fontSize(7).fillColor(MUTED);
      doc.text("Zusatzleistungen", LEFT, y, { width: CW });
      y += 8;
      doc.font("Helvetica").fontSize(9).fillColor(BODY);
      const addonsText = sanitizePdfText(data.addons.join(", "));
      doc.text(addonsText, LEFT, y, { width: CW, lineGap: 1.5 });
      y += doc.heightOfString(addonsText, { width: CW, lineGap: 1.5 }) + 4;
    }
    if (data.checklist && data.checklist.length > 0) {
      doc.font("Helvetica").fontSize(7).fillColor(MUTED);
      doc.text("Checkliste", LEFT, y, { width: CW });
      y += 8;
      doc.font("Helvetica").fontSize(9).fillColor(BODY);
      const checklistText = sanitizePdfText(data.checklist.join(", "));
      doc.text(checklistText, LEFT, y, { width: CW, lineGap: 1.5 });
      y += doc.heightOfString(checklistText, { width: CW, lineGap: 1.5 }) + 4;
    }

    if (data.notes) {
      doc.font("Helvetica").fontSize(7).fillColor(MUTED);
      doc.text("Hinweise", LEFT, y, { width: CW });
      y += 8;
      doc.font("Helvetica").fontSize(9).fillColor(BODY);
      const notesText = sanitizePdfText(data.notes);
      doc.text(notesText, LEFT, y, { width: CW, lineGap: 1.5 });
      y += doc.heightOfString(notesText, { width: CW, lineGap: 1.5 }) + 4;
    }
    y += 4;

    // LEISTUNGEN
    ensureSpace(30 + data.services.length * 20);
    sectionHeading("Leistungsumfang");

    const hasPrice = data.services.some((s) => s.priceCents !== undefined);

    data.services.forEach((s, i) => {
      const qty = s.quantity ? `  \u00B7  ${s.quantity} ${s.unit || "St\u00FCck"}` : "";
      const priceStr = hasPrice && s.priceCents !== undefined ? `   ${eur(s.priceCents)}` : "";
      const rowText = sanitizePdfText(`${i + 1}.  ${s.name}${qty}`);
      const textWidth = CW - 4 - (hasPrice ? 90 : 0);
      const rowHeight = Math.max(14, doc.heightOfString(rowText, { width: textWidth, lineGap: 1.2 }) + 2);
      ensureSpace(rowHeight + 2);
      doc.font("Helvetica").fontSize(9).fillColor(BODY);
      doc.text(rowText, LEFT + 4, y, { width: textWidth, lineGap: 1.2 });
      if (priceStr) {
        doc.text(priceStr, LEFT + 4, y, { width: CW - 4, align: "right" });
      }
      y += rowHeight;
    });
    y += 6;

    // PREISÜBERSICHT
    const priceCardH = 84;
    ensureSpace(priceCardH + 28);
    sectionHeading("Preis\u00FCbersicht");

    const pad = 14;
    const innerW = CW - pad * 2;

    doc.save();
    doc.roundedRect(LEFT, y, CW, priceCardH, 6).fill(LIGHT_BG);
    doc.roundedRect(LEFT, y, CW, priceCardH, 6).strokeColor(BORDER).lineWidth(0.75).stroke();
    doc.restore();

    const priceY = y + pad;

    doc.font("Helvetica").fontSize(9).fillColor(BODY);
    doc.text("Nettobetrag:", LEFT + pad, priceY);
    doc.text(eur(data.netCents), LEFT + pad, priceY, { width: innerW, align: "right" });

    doc.text("MwSt. (19%):", LEFT + pad, priceY + 20);
    doc.text(eur(data.vatCents), LEFT + pad, priceY + 20, { width: innerW, align: "right" });

    doc.strokeColor(BORDER).lineWidth(0.5)
      .moveTo(LEFT + pad, priceY + 40).lineTo(RIGHT - pad, priceY + 40).stroke();

    doc.font("Helvetica-Bold").fontSize(11).fillColor(DARK);
    doc.text("Gesamtbetrag (brutto):", LEFT + pad, priceY + 48);
    doc.text(eur(data.grossCents), LEFT + pad, priceY + 48, { width: innerW, align: "right" });

    y += priceCardH + 10;

    // TERMS
    ensureSpace(20);
    doc.font("Helvetica").fontSize(7).fillColor(MUTED);
    doc.text(
      "Dieses Angebot ist unverbindlich und 7 Tage gültig. Die Durchführung erfolgt gemäß unseren AGB (siehe Anlage). Änderungen vor Ort können zu Preisanpassungen führen.",
      LEFT, y, { width: CW },
    );

    // FOOTER (every page)
    function drawFooter() {
      const fy = H - M - FOOTER_H;
      doc.strokeColor(BORDER).lineWidth(0.5).moveTo(LEFT, fy).lineTo(RIGHT, fy).stroke();

      const fy1 = fy + 8;
      doc.font("Helvetica").fontSize(6.5).fillColor(MUTED);
      doc.text(
        "Schnell Sicher Umzug  \u00B7  Anzengruber Stra\u00DFe 9, 12043 Berlin  \u00B7  Tel.: +49 172 9573681  \u00B7  USt-IdNr.: DE454603297",
        LEFT, fy1, { width: CW, align: "center" },
      );
      doc.text(
        "Bankverbindung: Berliner Sparkasse  \u00B7  Kontoinhaber: Baschar Al Hasan  \u00B7  IBAN: DE75 1005 0000 0191 5325 76  \u00B7  BIC: BELADEBEXXX",
        LEFT, fy1 + 10, { width: CW, align: "center" },
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


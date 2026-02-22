import PDFDocument from "pdfkit";
import path from "path";
import { existsSync } from "fs";
import { getImageSlot, publicSrcToAbsolute } from "@/server/content/slots";

type QuoteLine = { label: string; qty: number; unit: number; total: number };

type QuoteInput = {
  publicId: string;
  customerName: string;
  customerEmail: string;
  serviceType: string;
  speed: string;
  slotLabel: string;
  lines: QuoteLine[];
  netCents: number;
  vatCents: number;
  grossCents: number;
};

function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

const BLUE = "#1e3a8a";
const DARK = "#0f172a";
const BODY = "#334155";
const MUTED = "#64748b";
const LIGHT_BG = "#f8fafc";
const BORDER = "#e2e8f0";
const ACCENT = "#2563eb";

const M = 56;
const W = 595;
const H = 842;
const LEFT = M;
const RIGHT = W - M;
const CW = RIGHT - LEFT;
const FOOTER_H = 52;
const SAFE_BOTTOM = H - M - FOOTER_H - 10;

export async function generateQuotePdf(input: QuoteInput): Promise<Buffer> {
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
        Title: `Angebot ${input.publicId}`,
        Author: "Schnell Sicher Umzug",
        Subject: "Umzugsangebot",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let y = M;

    function ensureSpace(need: number) {
      if (y + need > SAFE_BOTTOM) {
        doc.addPage();
        y = M;
      }
    }

    function sectionHeading(label: string) {
      ensureSpace(30);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(BLUE);
      doc.text(label.toUpperCase(), LEFT, y, { width: CW, characterSpacing: 0.8 });
      y += 16;
      doc.strokeColor(ACCENT).lineWidth(0.5).moveTo(LEFT, y).lineTo(LEFT + 40, y).stroke();
      y += 10;
    }

    function labelValue(label: string, value: string, x: number, w: number) {
      doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);
      doc.text(label, x, y, { width: w });
      y += 9;
      doc.font("Helvetica").fontSize(9.5).fillColor(DARK);
      doc.text(value, x, y, { width: w });
      y += 14;
    }

    // ━━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const logoPath = slotLogoPath ?? path.join(process.cwd(), "public", "media", "brand", "hero-logo.jpeg");
    const logoSize = 52;
    if (existsSync(logoPath)) {
      try {
        doc.image(logoPath, LEFT, y, { width: logoSize, height: logoSize });
      } catch {
        doc.font("Helvetica-Bold").fontSize(13).fillColor(BLUE);
        doc.text("SSU", LEFT, y + 16);
      }
    } else {
      doc.font("Helvetica-Bold").fontSize(11).fillColor(BLUE);
      doc.text("Schnell Sicher Umzug", LEFT, y + 16);
    }

    const companyLines = [
      { text: "Schnell Sicher Umzug", bold: true },
      { text: "Anzengruber Straße 9, 12043 Berlin", bold: false },
      { text: "Tel.: +49 172 9573681", bold: false },
      { text: "kontakt@schnellsicherumzug.de", bold: false },
      { text: "USt-IdNr.: DE454603297", bold: false },
    ];
    let cy = y;
    for (const line of companyLines) {
      doc.font(line.bold ? "Helvetica-Bold" : "Helvetica").fontSize(7.5).fillColor(MUTED);
      doc.text(line.text, LEFT, cy, { width: CW, align: "right" });
      cy += 9;
    }

    y += logoSize + 12;

    doc.strokeColor(BLUE).lineWidth(1.5).moveTo(LEFT, y).lineTo(RIGHT, y).stroke();
    y += 24;

    // ━━━ TITLE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    doc.font("Helvetica-Bold").fontSize(22).fillColor(DARK);
    doc.text("ANGEBOT", LEFT, y, { width: CW, align: "center" });
    y += 30;

    doc.font("Helvetica").fontSize(9).fillColor(MUTED);
    doc.text(`Nr. ${input.publicId}  ·  Termin: ${input.slotLabel}`, LEFT, y, {
      width: CW,
      align: "center",
    });
    y += 28;

    // ━━━ KUNDENANGABEN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    sectionHeading("Kundenangaben");

    const colW = Math.floor(CW / 2) - 8;
    const savedY = y;

    labelValue("Name", input.customerName, LEFT, colW);
    const leftEnd = y;

    y = savedY;
    labelValue("E-Mail", input.customerEmail, LEFT + colW + 16, colW);
    const rightEnd = y;

    y = Math.max(leftEnd, rightEnd) + 8;

    // ━━━ AUFTRAGSDETAILS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const serviceLabel =
      input.serviceType === "UMZUG" || input.serviceType === "MOVING"
        ? "Umzug"
        : input.serviceType === "ENTSORGUNG" || input.serviceType === "DISPOSAL"
          ? "Entsorgung"
          : "Umzug + Entsorgung";

    const speedLabel =
      input.speed === "ECONOMY" ? "Economy" : input.speed === "EXPRESS" ? "Express" : "Standard";

    sectionHeading("Auftragsdetails");

    const savedY2 = y;

    labelValue("Leistung", serviceLabel, LEFT, colW);
    labelValue("Termin", input.slotLabel, LEFT, colW);
    const leftEnd2 = y;

    y = savedY2;
    labelValue("Priorität", speedLabel, LEFT + colW + 16, colW);
    const rightEnd2 = y;

    y = Math.max(leftEnd2, rightEnd2) + 8;

    // ━━━ LEISTUNGEN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (input.lines.length > 0) {
      ensureSpace(40 + input.lines.length * 18);
      sectionHeading("Leistungsumfang");

      doc.font("Helvetica").fontSize(9.5).fillColor(BODY);
      input.lines.forEach((line, i) => {
        doc.text(`${i + 1}.  ${line.label}  ·  ${line.qty} Stück`, LEFT + 4, y, { width: CW - 4 });
        y += 16;
      });
      y += 10;
    }

    // ━━━ PREISÜBERSICHT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const priceCardH = 100;
    ensureSpace(priceCardH + 40);
    sectionHeading("Preisübersicht");

    const pad = 18;
    const innerW = CW - pad * 2;

    doc.save();
    doc.roundedRect(LEFT, y, CW, priceCardH, 6).fill(LIGHT_BG);
    doc.roundedRect(LEFT, y, CW, priceCardH, 6).strokeColor(BORDER).lineWidth(0.75).stroke();
    doc.restore();

    const priceY = y + pad;

    doc.font("Helvetica").fontSize(9.5).fillColor(BODY);
    doc.text("Nettobetrag:", LEFT + pad, priceY);
    doc.text(eur(input.netCents), LEFT + pad, priceY, { width: innerW, align: "right" });

    doc.text("MwSt. (19%):", LEFT + pad, priceY + 22);
    doc.text(eur(input.vatCents), LEFT + pad, priceY + 22, { width: innerW, align: "right" });

    doc
      .strokeColor(BORDER)
      .lineWidth(0.5)
      .moveTo(LEFT + pad, priceY + 46)
      .lineTo(RIGHT - pad, priceY + 46)
      .stroke();

    doc.font("Helvetica-Bold").fontSize(11).fillColor(DARK);
    doc.text("Gesamtbetrag (brutto):", LEFT + pad, priceY + 54);
    doc.text(eur(input.grossCents), LEFT + pad, priceY + 54, { width: innerW, align: "right" });

    y += priceCardH + 18;

    // ━━━ TERMS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ensureSpace(30);
    doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);
    doc.text(
      "Dieses Angebot wurde automatisch erstellt und dient als Vorabinformation. Die Durchführung erfolgt gemäß unseren AGB.",
      LEFT,
      y,
      { width: CW },
    );

    // ━━━ FOOTER (every page) ━━━━━━━━━━━━━━━━━━━━━━━━━━
    function drawFooter() {
      const fy = H - M - FOOTER_H;
      doc.strokeColor(BORDER).lineWidth(0.5).moveTo(LEFT, fy).lineTo(RIGHT, fy).stroke();

      const fy1 = fy + 8;
      doc.font("Helvetica").fontSize(6.5).fillColor(MUTED);
      doc.text(
        "Schnell Sicher Umzug  ·  Anzengruber Straße 9, 12043 Berlin  ·  Tel.: +49 172 9573681  ·  USt-IdNr.: DE454603297",
        LEFT,
        fy1,
        { width: CW, align: "center" },
      );
      doc.text(
        "Bankverbindung: Berliner Sparkasse  ·  Kontoinhaber: Baschar Al Hasan  ·  IBAN: DE75 1005 0000 0191 5325 76  ·  BIC: BELADEBEXXX",
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

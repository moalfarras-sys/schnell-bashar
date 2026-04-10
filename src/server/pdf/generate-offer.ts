import PDFDocument from "pdfkit";
import path from "path";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { existsSync } from "fs";
import { getImageSlot, publicSrcToAbsolute } from "@/server/content/slots";
import {
  PDF_THEME,
  TableColumn,
  drawBodyText,
  drawPageHeader,
  drawSectionCard,
  drawSectionHeading,
  drawTable,
  ensurePageSpace,
  pdfContentWidth,
  pdfPageLayout,
  renderFooterOnAllPages,
  sanitizePdfText,
} from "@/server/pdf/layout";

export interface OfferData {
  offerId: string;
  offerNo?: string;
  quoteId?: string;
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

const OFFER_TERMS =
  "Dieses Angebot ist 7 Tage gültig. Die Durchführung erfolgt gemäß unseren AGB. Änderungen des Leistungsumfangs vor Ort können eine Preisanpassung erfordern.";

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

    const left = PDF_THEME.page.marginX;
    const width = pdfContentWidth();
    const layout = pdfPageLayout();
    const logoPath =
      (data.logoPath && existsSync(data.logoPath) && data.logoPath) ||
      (slotLogoPath && existsSync(slotLogoPath) ? slotLogoPath : path.join(process.cwd(), "public", "media", "brand", "hero-logo.jpeg"));

    let y = drawPageHeader(doc, {
      y: 18,
      contentWidth: width,
      title: "ANGEBOT",
      documentTag: "UMZUGSANGEBOT",
      metaRows: [
        { label: "Angebotsnr.", value: data.offerNo || data.offerId },
        { label: "Auftrag", value: data.orderNo || "Noch offen" },
        { label: "Datum", value: fmtDate(data.offerDate) },
        { label: "Gültig bis", value: fmtDate(data.validUntil) },
      ],
      logoPath,
      companyLines: [
        { text: "Schnell Sicher Umzug", bold: true },
        { text: "Anzengruber Straße 9, 12043 Berlin" },
        { text: "Tel.: +49 172 9573681" },
        { text: "kontakt@schnellsicherumzug.de" },
        { text: "USt-IdNr.: DE454603297" },
      ],
    });

    const gap = 14;
    const colW = (width - gap) / 2;
    const customerLines = [data.customerName, data.customerAddress, data.customerPhone, data.customerEmail]
      .filter(Boolean)
      .map((value, index) => (index === 2 ? `Tel.: ${value}` : index === 3 ? `E-Mail: ${value}` : String(value)));
    const customerH =
      34 +
      customerLines.reduce(
        (sum, line) =>
          sum + doc.font("Helvetica").fontSize(8.9).heightOfString(sanitizePdfText(line), { width: colW - 28, lineGap: 1.55 }) + 4,
        0,
      );
    const detailRows = [
      data.moveFrom ? `Von: ${data.moveFrom}${data.floorFrom != null ? ` (${data.floorFrom}. OG${data.elevatorFrom ? ", Aufzug" : ""})` : ""}` : null,
      data.moveTo ? `Nach: ${data.moveTo}${data.floorTo != null ? ` (${data.floorTo}. OG${data.elevatorTo ? ", Aufzug" : ""})` : ""}` : null,
      data.moveDate ? `Termin: ${fmtDate(data.moveDate)}${data.moveTime ? `, ${data.moveTime}` : ""}` : null,
      `Leistungsart: ${serviceTypeLabel(data.serviceType)}`,
      `Priorität: ${speedLabel(data.speed)}`,
      data.volumeM3 ? `Volumen: ${data.volumeM3} m³` : null,
      data.needNoParkingZone ? "Halteverbotszone: Ja" : null,
    ].filter(Boolean) as string[];
    const detailsH =
      34 +
      detailRows.reduce(
        (sum, line) =>
          sum + doc.font("Helvetica").fontSize(8.7).heightOfString(sanitizePdfText(line), { width: colW - 28, lineGap: 1.5 }) + 4,
        0,
      );
    const infoH = Math.max(customerH, detailsH);

    drawSectionCard(doc, {
      x: left,
      y,
      width: colW,
      height: infoH,
      fill: PDF_THEME.colors.card,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });
    drawSectionCard(doc, {
      x: left + colW + gap,
      y,
      width: colW,
      height: infoH,
      fill: PDF_THEME.colors.card,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });
    doc.font(PDF_THEME.type.cardTitle.font).fontSize(PDF_THEME.type.cardTitle.size).fillColor(PDF_THEME.colors.muted);
    doc.text("KUNDENDATEN", left + 14, y + 12);
    doc.text("AUFTRAGSDETAILS", left + colW + gap + 14, y + 12);

    let innerLeftY = y + 28;
    customerLines.forEach((line, index) => {
      innerLeftY = drawBodyText(doc, line, left + 14, innerLeftY, colW - 28, {
        size: index === 0 ? 10.2 : 8.9,
        font: index === 0 ? "Helvetica-Bold" : "Helvetica",
        lineGap: 1.55,
        color: PDF_THEME.colors.ink,
      });
      innerLeftY += 4;
    });

    let innerRightY = y + 28;
    detailRows.forEach((line) => {
      innerRightY = drawBodyText(doc, line, left + colW + gap + 14, innerRightY, colW - 28, {
        size: 8.7,
        lineGap: 1.5,
        color: PDF_THEME.colors.body,
      });
      innerRightY += 4;
    });

    y += infoH + 14;

    const optionalBlocks: Array<{ title: string; text: string }> = [];
    if (data.addons?.length) optionalBlocks.push({ title: "Zusatzleistungen", text: data.addons.join(", ") });
    if (data.checklist?.length) optionalBlocks.push({ title: "Checkliste", text: data.checklist.join(", ") });
    if (data.notes) optionalBlocks.push({ title: "Hinweise", text: data.notes });
    if (optionalBlocks.length > 0) {
      const blockHeights = optionalBlocks.map(
        (block) =>
          28 +
          doc.font("Helvetica").fontSize(8.6).heightOfString(sanitizePdfText(block.text), { width: width - 28, lineGap: 1.6 }) +
          10,
      );
      const panelH = blockHeights.reduce((sum, value) => sum + value, 0) + (optionalBlocks.length - 1) * 8;
      y = ensurePageSpace(doc, y, panelH + 6, layout);
      drawSectionCard(doc, {
        x: left,
        y,
        width,
        height: panelH + 6,
        fill: PDF_THEME.colors.card,
        border: PDF_THEME.colors.border,
        borderWidth: 0.8,
        radius: PDF_THEME.radius.card,
      });
      let contentY = y + 14;
      optionalBlocks.forEach((block, index) => {
        doc.font(PDF_THEME.type.cardTitle.font).fontSize(7.3).fillColor(PDF_THEME.colors.muted);
        doc.text(block.title.toUpperCase(), left + 14, contentY);
        contentY = drawBodyText(doc, block.text, left + 14, contentY + 12, width - 28, {
          size: 8.6,
          lineGap: 1.6,
          color: PDF_THEME.colors.body,
        });
        if (index < optionalBlocks.length - 1) contentY += 10;
      });
      y = contentY + 10;
    }

    y = ensurePageSpace(doc, y, 120, layout);
    y = drawSectionHeading(doc, "Leistungsumfang", left, y, width);

    const serviceRows = data.services.map((service) => ({
      description: service.description ? `${service.name} · ${service.description}` : service.name,
      quantity: service.quantity ?? 1,
      unit: service.unit || "Paket",
      total: service.priceCents ?? 0,
    }));
    const columns: TableColumn<(typeof serviceRows)[number]>[] = [
      { key: "description", header: "Beschreibung", width: 320, value: (row) => row.description },
      { key: "quantity", header: "Menge", width: 60, align: "center", value: (row) => String(row.quantity) },
      { key: "unit", header: "Einheit", width: 64, align: "center", value: (row) => row.unit },
      { key: "total", header: "Gesamt", width: width - 320 - 60 - 64, align: "right", value: (row) => eur(row.total) },
    ];
    y = drawTable({
      doc,
      y,
      layout,
      x: left,
      width,
      columns,
      rows: serviceRows,
      zebra: true,
      card: true,
    });

    y += 14;
    y = ensurePageSpace(doc, y, 160, layout);
    const sumH = 84;
    drawSectionCard(doc, {
      x: left,
      y,
      width,
      height: sumH,
      fill: PDF_THEME.colors.panel,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });
    doc.font(PDF_THEME.type.cardTitle.font).fontSize(7.4).fillColor(PDF_THEME.colors.muted);
    doc.text("PREISÜBERSICHT", left + 16, y + 14);
    doc.font(PDF_THEME.type.body.font).fontSize(9).fillColor(PDF_THEME.colors.body);
    doc.text("Nettobetrag", left + 16, y + 34);
    doc.text(eur(data.netCents), left + 16, y + 34, { width: width - 32, align: "right" });
    doc.text("MwSt. (19 %)", left + 16, y + 50);
    doc.text(eur(data.vatCents), left + 16, y + 50, { width: width - 32, align: "right" });
    doc.strokeColor(PDF_THEME.colors.border).lineWidth(0.65).moveTo(left + 16, y + 66).lineTo(left + width - 16, y + 66).stroke();
    doc.font(PDF_THEME.type.total.font).fontSize(15).fillColor(PDF_THEME.colors.ink);
    doc.text("Gesamtbetrag", left + 16, y + 70);
    doc.text(eur(data.grossCents), left + 16, y + 70, { width: width - 32, align: "right" });

    y += sumH + 14;
    const termsH = 46;
    drawSectionCard(doc, {
      x: left,
      y,
      width,
      height: termsH,
      fill: PDF_THEME.colors.warnBg,
      border: PDF_THEME.colors.warnBorder,
      borderWidth: 0.9,
      radius: PDF_THEME.radius.card,
    });
    doc.font(PDF_THEME.type.cardTitle.font).fontSize(7.5).fillColor("#9a6700");
    doc.text("WICHTIGE HINWEISE", left + 16, y + 12);
    drawBodyText(doc, OFFER_TERMS, left + 16, y + 23, width - 32, {
      size: 8.3,
      lineGap: 1.45,
      color: PDF_THEME.colors.ink,
    });

    renderFooterOnAllPages(doc);
    doc.end();
  });
}

import PDFDocument from "pdfkit";
import path from "path";
import { existsSync } from "fs";
import { getImageSlot, publicSrcToAbsolute } from "@/server/content/slots";
import {
  PDF_THEME,
  TableColumn,
  drawPageHeader,
  drawSectionCard,
  drawSectionHeading,
  drawTable,
  pdfContentWidth,
  pdfPageLayout,
  renderFooterOnAllPages,
  sanitizePdfText,
} from "@/server/pdf/layout";

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

function serviceLabel(value: string) {
  if (value === "DISPOSAL" || value === "ENTSORGUNG") return "Entsorgung";
  if (value === "COMBO" || value === "KOMBI") return "Umzug + Entsorgung";
  return "Umzug";
}

function speedLabel(value: string) {
  if (value === "EXPRESS") return "Express";
  if (value === "ECONOMY") return "Economy";
  return "Standard";
}

export async function generateQuotePdf(input: QuoteInput): Promise<Buffer> {
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
        Title: `Angebot ${input.publicId}`,
        Author: "Schnell Sicher Umzug",
        Subject: "Kurzangebot",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = PDF_THEME.page.marginX;
    const width = pdfContentWidth();
    const layout = pdfPageLayout();
    let y = drawPageHeader(doc, {
      y: 18,
      contentWidth: width,
      title: "KURZANGEBOT",
      documentTag: "VORABKALKULATION",
      metaRows: [
        { label: "Angebotsnr.", value: input.publicId },
        { label: "Termin", value: input.slotLabel },
      ],
      logoPath:
        slotLogoPath && existsSync(slotLogoPath)
          ? slotLogoPath
          : path.join(process.cwd(), "public", "media", "brand", "hero-logo.jpeg"),
      companyLines: [
        { text: "Schnell Sicher Umzug", bold: true },
        { text: "Anzengruber Straße 9, 12043 Berlin" },
        { text: "Tel.: +49 172 9573681" },
        { text: "kontakt@schnellsicherumzug.de" },
        { text: "USt-IdNr.: DE454603297" },
      ],
    });

    const colGap = 14;
    const colW = (width - colGap) / 2;
    const cardH = 78;
    drawSectionCard(doc, {
      x: left,
      y,
      width: colW,
      height: cardH,
      fill: PDF_THEME.colors.card,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });
    drawSectionCard(doc, {
      x: left + colW + colGap,
      y,
      width: colW,
      height: cardH,
      fill: PDF_THEME.colors.card,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });

    doc.font(PDF_THEME.type.cardTitle.font).fontSize(PDF_THEME.type.cardTitle.size).fillColor(PDF_THEME.colors.muted);
    doc.text("KUNDE", left + 14, y + 12);
    doc.text("LEISTUNG", left + colW + colGap + 14, y + 12);

    doc.font(PDF_THEME.type.body.font).fontSize(PDF_THEME.type.body.size).fillColor(PDF_THEME.colors.ink);
    doc.text(sanitizePdfText(input.customerName), left + 14, y + 28, { width: colW - 28, lineGap: 1.7 });
    doc.text(sanitizePdfText(input.customerEmail), left + 14, y + 45, { width: colW - 28, lineGap: 1.7 });

    doc.text(`Service: ${serviceLabel(input.serviceType)}`, left + colW + colGap + 14, y + 28, {
      width: colW - 28,
      lineGap: 1.7,
    });
    doc.text(`Priorität: ${speedLabel(input.speed)}`, left + colW + colGap + 14, y + 45, {
      width: colW - 28,
      lineGap: 1.7,
    });

    y += cardH + 20;
    y = drawSectionHeading(doc, "Leistungsübersicht", left, y, width);

    const columns: TableColumn<QuoteLine>[] = [
      {
        key: "label",
        header: "Beschreibung",
        width: 315,
        value: (row) => row.label,
      },
      {
        key: "qty",
        header: "Menge",
        width: 60,
        align: "center",
        value: (row) => String(row.qty || 1),
      },
      {
        key: "unit",
        header: "Einzelpreis",
        width: 74,
        align: "right",
        value: (row) => eur(row.unit),
      },
      {
        key: "total",
        header: "Gesamt",
        width: width - 315 - 60 - 74,
        align: "right",
        value: (row) => eur(row.total),
      },
    ];

    y = drawTable({
      doc,
      y,
      layout,
      x: left,
      width,
      columns,
      rows: input.lines,
      card: true,
      zebra: true,
    });

    y += 14;
    const summaryH = 92;
    drawSectionCard(doc, {
      x: left,
      y,
      width,
      height: summaryH,
      fill: PDF_THEME.colors.panel,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });

    doc.font(PDF_THEME.type.cardTitle.font).fontSize(7.4).fillColor(PDF_THEME.colors.muted);
    doc.text("PREISZUSAMMENFASSUNG", left + 16, y + 14);
    doc.font(PDF_THEME.type.body.font).fontSize(9).fillColor(PDF_THEME.colors.body);
    doc.text("Nettobetrag", left + 16, y + 34);
    doc.text(eur(input.netCents), left + 16, y + 34, { width: width - 32, align: "right" });
    doc.text("MwSt. (19 %)", left + 16, y + 52);
    doc.text(eur(input.vatCents), left + 16, y + 52, { width: width - 32, align: "right" });
    doc.strokeColor(PDF_THEME.colors.border).lineWidth(0.6).moveTo(left + 16, y + 69).lineTo(left + width - 16, y + 69).stroke();
    doc.font(PDF_THEME.type.total.font).fontSize(14.5).fillColor(PDF_THEME.colors.ink);
    doc.text("Gesamt", left + 16, y + 74);
    doc.text(eur(input.grossCents), left + 16, y + 74, { width: width - 32, align: "right" });

    y += summaryH + 14;
    drawSectionCard(doc, {
      x: left,
      y,
      width,
      height: 54,
      fill: PDF_THEME.colors.warnBg,
      border: PDF_THEME.colors.warnBorder,
      borderWidth: 0.9,
      radius: PDF_THEME.radius.card,
    });
    doc.font(PDF_THEME.type.cardTitle.font).fontSize(7.5).fillColor("#9a6700");
    doc.text("WICHTIGER HINWEIS", left + 16, y + 14);
    doc.font(PDF_THEME.type.bodySmall.font).fontSize(8.5).fillColor(PDF_THEME.colors.ink);
    doc.text(
      "Dieses Kurzangebot ist eine belastbare Vorabkalkulation. Die endgültige Durchführung erfolgt auf Basis des bestätigten Angebots oder Vertrags sowie unserer AGB.",
      left + 16,
      y + 26,
      { width: width - 32, lineGap: 1.6 },
    );

    renderFooterOnAllPages(doc);
    doc.end();
  });
}

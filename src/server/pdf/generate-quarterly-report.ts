import PDFDocument from "pdfkit";
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

type QuarterlyReportData = {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  periodStart: Date;
  periodEnd: Date;
  revenue: { netCents: number; vatCents: number; grossCents: number; paidCents: number };
  expenses: { netCents: number; vatCents: number; grossCents: number };
  ust: { outputVatCents: number; inputVatCents: number; vatPayableCents: number };
  profitBeforeTaxCents: number;
  byCategory: Array<{
    categoryName: string;
    count: number;
    netCents: number;
    vatCents: number;
    grossCents: number;
  }>;
  warnings: string[];
  dataSourceNote: string;
};

function eur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function dateDe(value: Date) {
  return value.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function generateQuarterlyReportPdf(input: QuarterlyReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      bufferPages: true,
      margins: { top: 0, left: 0, right: 0, bottom: 0 },
      info: {
        Title: `Quartalsbericht ${input.year} Q${input.quarter}`,
        Author: "Schnell Sicher Umzug",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = PDF_THEME.page.marginX;
    const width = pdfContentWidth();
    const layout = pdfPageLayout();

    let y = drawPageHeader(doc, {
      y: 18,
      contentWidth: width,
      title: `QUARTALSBERICHT Q${input.quarter}/${input.year}`,
      documentTag: "INTERNES REPORTING",
      metaRows: [
        { label: "Zeitraum", value: `${dateDe(input.periodStart)} - ${dateDe(input.periodEnd)}` },
        { label: "Erstellt", value: new Date().toLocaleDateString("de-DE") },
      ],
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
    const blockH = 88;
    const blocks = [
      { title: "Umsätze", lines: [["Netto", eur(input.revenue.netCents)], ["USt", eur(input.revenue.vatCents)], ["Brutto", eur(input.revenue.grossCents)], ["Bezahlt", eur(input.revenue.paidCents)]] },
      { title: "Ausgaben", lines: [["Netto", eur(input.expenses.netCents)], ["Vorsteuer", eur(input.expenses.vatCents)], ["Brutto", eur(input.expenses.grossCents)], ["Ergebnis", eur(input.profitBeforeTaxCents)]] },
    ];

    blocks.forEach((block, index) => {
      const x = left + index * (colW + gap);
      drawSectionCard(doc, {
        x,
        y,
        width: colW,
        height: blockH,
        fill: PDF_THEME.colors.card,
        border: PDF_THEME.colors.border,
        borderWidth: 0.8,
        radius: PDF_THEME.radius.card,
      });
      doc.font(PDF_THEME.type.cardTitle.font).fontSize(7.4).fillColor(PDF_THEME.colors.muted);
      doc.text(block.title.toUpperCase(), x + 14, y + 12);
      let innerY = y + 30;
      block.lines.forEach(([label, value], rowIndex) => {
        doc.font(rowIndex === block.lines.length - 1 ? "Helvetica-Bold" : "Helvetica").fontSize(rowIndex === block.lines.length - 1 ? 9.8 : 8.8).fillColor(PDF_THEME.colors.body);
        doc.text(label, x + 14, innerY);
        doc.text(value, x + 14, innerY, { width: colW - 28, align: "right" });
        innerY += 14;
      });
    });

    y += blockH + 18;
    y = drawSectionHeading(doc, "Umsatzsteuer-Übersicht", left, y, width);
    drawSectionCard(doc, {
      x: left,
      y,
      width,
      height: 66,
      fill: PDF_THEME.colors.panel,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });
    doc.font(PDF_THEME.type.body.font).fontSize(9).fillColor(PDF_THEME.colors.body);
    [
      ["Ausgangs-USt", eur(input.ust.outputVatCents)],
      ["Vorsteuer", eur(input.ust.inputVatCents)],
      ["USt-Zahllast", eur(input.ust.vatPayableCents)],
    ].forEach(([label, value], index) => {
      const rowY = y + 16 + index * 15;
      doc.text(label, left + 16, rowY);
      doc.text(value, left + 16, rowY, { width: width - 32, align: "right" });
    });

    y += 84;
    y = ensurePageSpace(doc, y, 120, layout);
    y = drawSectionHeading(doc, "Top-Ausgabenkategorien", left, y, width);
    const columns: TableColumn<(typeof input.byCategory)[number]>[] = [
      { key: "category", header: "Kategorie", width: 250, value: (row) => row.categoryName },
      { key: "count", header: "Anzahl", width: 60, align: "center", value: (row) => String(row.count) },
      { key: "net", header: "Netto", width: 72, align: "right", value: (row) => eur(row.netCents) },
      { key: "vat", header: "USt", width: 60, align: "right", value: (row) => eur(row.vatCents) },
      { key: "gross", header: "Brutto", width: width - 250 - 60 - 72 - 60, align: "right", value: (row) => eur(row.grossCents) },
    ];

    y = drawTable({
      doc,
      y,
      layout,
      x: left,
      width,
      columns,
      rows: input.byCategory.length > 0 ? input.byCategory.slice(0, 12) : [{ categoryName: "Keine Ausgaben im Zeitraum erfasst.", count: 0, netCents: 0, vatCents: 0, grossCents: 0 }],
      card: true,
      zebra: true,
    });

    y += 14;
    y = ensurePageSpace(doc, y, 88, layout);
    drawSectionCard(doc, {
      x: left,
      y,
      width,
      height: input.warnings.length > 0 ? 84 : 56,
      fill: PDF_THEME.colors.card,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });
    doc.font(PDF_THEME.type.cardTitle.font).fontSize(7.4).fillColor(PDF_THEME.colors.muted);
    doc.text("ANMERKUNGEN / DATENQUELLE", left + 16, y + 14);
    let textY = drawBodyText(doc, sanitizePdfText(input.dataSourceNote), left + 16, y + 28, width - 32, {
      size: 8.5,
      lineGap: 1.7,
      color: PDF_THEME.colors.body,
    });
    if (input.warnings.length > 0) {
      textY += 6;
      doc.font("Helvetica-Bold").fontSize(8.4).fillColor(PDF_THEME.colors.ink);
      doc.text("Hinweise", left + 16, textY);
      textY += 12;
      input.warnings.forEach((warning) => {
        textY = drawBodyText(doc, `• ${sanitizePdfText(warning)}`, left + 16, textY, width - 32, {
          size: 8.3,
          lineGap: 1.6,
          color: PDF_THEME.colors.body,
        });
        textY += 4;
      });
    }

    renderFooterOnAllPages(doc, {
      centeredNote: "Schnell Sicher Umzug · Interner Quartalsbericht · Nur für interne Buchhaltung und Controlling",
    });
    doc.end();
  });
}

import PDFDocument from "pdfkit";

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
      margins: { top: 48, left: 48, right: 48, bottom: 48 },
      info: {
        Title: `Quartalsbericht ${input.year} Q${input.quarter}`,
        Author: "Schnell Sicher Umzug",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(22).fillColor("#0f172a");
    doc.text(`Quartalsbericht Q${input.quarter}/${input.year}`);
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(10).fillColor("#334155");
    doc.text(`Zeitraum: ${dateDe(input.periodStart)} - ${dateDe(input.periodEnd)}`);
    doc.moveDown(1.2);

    doc.font("Helvetica-Bold").fontSize(13).fillColor("#0f172a");
    doc.text("Umsätze (bezahlt)");
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(10).fillColor("#1f2937");
    doc.text(`Netto: ${eur(input.revenue.netCents)}`);
    doc.text(`USt: ${eur(input.revenue.vatCents)}`);
    doc.text(`Brutto: ${eur(input.revenue.grossCents)}`);
    doc.text(`Eingang (paid): ${eur(input.revenue.paidCents)}`);
    doc.moveDown(1);

    doc.font("Helvetica-Bold").fontSize(13).fillColor("#0f172a");
    doc.text("Betriebsausgaben");
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(10).fillColor("#1f2937");
    doc.text(`Netto: ${eur(input.expenses.netCents)}`);
    doc.text(`Vorsteuer: ${eur(input.expenses.vatCents)}`);
    doc.text(`Brutto: ${eur(input.expenses.grossCents)}`);
    doc.moveDown(1);

    doc.font("Helvetica-Bold").fontSize(13).fillColor("#0f172a");
    doc.text("Umsatzsteuer-Übersicht");
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(10).fillColor("#1f2937");
    doc.text(`Ausgangs-USt: ${eur(input.ust.outputVatCents)}`);
    doc.text(`Vorsteuer: ${eur(input.ust.inputVatCents)}`);
    doc.text(`USt-Zahllast: ${eur(input.ust.vatPayableCents)}`);
    doc.moveDown(1);

    doc.font("Helvetica-Bold").fontSize(13).fillColor("#0f172a");
    doc.text("Ergebnis");
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(10).fillColor("#1f2937");
    doc.text(`Vorläufiges Ergebnis (Netto): ${eur(input.profitBeforeTaxCents)}`);
    doc.moveDown(1);

    doc.font("Helvetica-Bold").fontSize(13).fillColor("#0f172a");
    doc.text("Top-Ausgabenkategorien");
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(10).fillColor("#1f2937");
    if (input.byCategory.length === 0) {
      doc.text("Keine Ausgaben im Zeitraum erfasst.");
    } else {
      for (const row of input.byCategory.slice(0, 10)) {
        doc.text(`${row.categoryName} (${row.count}): ${eur(row.grossCents)}`);
      }
    }
    doc.moveDown(1);

    doc.font("Helvetica-Bold").fontSize(12).fillColor("#0f172a");
    doc.text("Anmerkungen / Datenquelle");
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(9).fillColor("#334155");
    doc.text(input.dataSourceNote, { align: "left" });
    if (input.warnings.length > 0) {
      doc.moveDown(0.4);
      doc.font("Helvetica-Bold").text("Hinweise:");
      doc.font("Helvetica");
      for (const warning of input.warnings) {
        doc.text(`• ${warning}`);
      }
    }

    doc.end();
  });
}

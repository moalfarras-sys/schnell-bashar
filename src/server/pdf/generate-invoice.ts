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
  drawLabelValue,
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
  notes?: string;
  lineItems?: Array<{
    name: string;
    detailLines?: string[];
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
  manualReferenceRows?: Array<{ label: string; value: string }>;
  serviceDetailRows?: Array<{ label: string; value: string }>;
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

const PAYMENT_NOTICE =
  "Die Zahlung spätestens 3 Tage vor dem Umzugstag überweisen oder am Umzugstag in Echtzeitüberweisung oder in Bar 50% vor dem Beladen und 50 % vor dem Entladen.";

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
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
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      info: {
        Title: `Rechnung ${data.invoiceNo || data.invoiceId}`,
        Author: "Schnell Sicher Umzug",
        Subject: "Rechnung",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = PDF_THEME.page.marginX;
    const width = pdfContentWidth();
    const layout = pdfPageLayout();
    const logoPath =
      slotLogoPath && existsSync(slotLogoPath)
        ? slotLogoPath
        : path.join(process.cwd(), "public", "media", "brand", "hero-logo.jpeg");

    let y = drawPageHeader(doc, {
      y: 18,
      contentWidth: width,
      title: "RECHNUNG",
      documentTag: "ABRECHNUNG",
      metaRows: [
        { label: "Rechnungsnr.", value: data.invoiceNo || data.invoiceId },
        { label: "Datum", value: fmtDate(data.issuedAt) },
        { label: "Fällig", value: fmtDate(data.dueAt) },
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
    const leftCardLines = [
      data.customerName,
      data.address,
      data.customerPhone ? `Tel.: ${data.customerPhone}` : null,
      `E-Mail: ${data.customerEmail}`,
    ].filter(Boolean) as string[];
    const leftCardHeight =
      34 +
      leftCardLines.reduce(
        (sum, line) =>
          sum +
          doc
            .font(PDF_THEME.type.body.font)
            .fontSize(8.9)
            .heightOfString(sanitizePdfText(line), { width: colW - 28, lineGap: 1.55 }) +
          4,
        0,
      );
    const refs =
      data.manualReferenceRows && data.manualReferenceRows.length > 0
        ? data.manualReferenceRows.map((row) => [row.label, row.value] as [string, string])
        : ([
            data.orderNo ? ["Auftrag", data.orderNo] : null,
            data.offerNo ? ["Angebot", data.offerNo] : null,
            data.contractNo ? ["Vertrag", data.contractNo] : null,
          ].filter(Boolean) as [string, string][]);
    const refsCardHeight = Math.max(92, 34 + refs.length * 16);
    const infoCardH = Math.max(leftCardHeight, refsCardHeight);

    y = ensurePageSpace(doc, y, infoCardH + 14, layout);

    drawSectionCard(doc, {
      x: left,
      y,
      width: colW,
      height: infoCardH,
      fill: PDF_THEME.colors.card,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });
    drawSectionCard(doc, {
      x: left + colW + gap,
      y,
      width: colW,
      height: infoCardH,
      fill: PDF_THEME.colors.card,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });

    doc.font(PDF_THEME.type.cardTitle.font).fontSize(PDF_THEME.type.cardTitle.size).fillColor(PDF_THEME.colors.muted);
    doc.text("RECHNUNGSEMPFÄNGER", left + 14, y + 12);
    doc.text("REFERENZEN", left + colW + gap + 14, y + 12);

    let leftY = y + 28;
    leftCardLines.forEach((line, index) => {
      leftY = drawBodyText(doc, line, left + 14, leftY, colW - 28, {
        size: index === 0 ? 10.4 : 8.9,
        font: index === 0 ? "Helvetica-Bold" : "Helvetica",
        lineGap: 1.55,
        color: PDF_THEME.colors.ink,
      });
      leftY += 4;
    });

    let rightY = y + 28;
    refs.forEach(([label, value]) => {
      doc.font("Helvetica").fontSize(7.5).fillColor(PDF_THEME.colors.muted);
      doc.text(label, left + colW + gap + 14, rightY, { width: 60 });
      doc.font("Helvetica-Bold").fontSize(8.9).fillColor(PDF_THEME.colors.ink);
      doc.text(value, left + colW + gap + 76, rightY, { width: colW - 90, align: "right" });
      rightY += 16;
    });

    y += infoCardH + 14;

    if ((data.serviceDetailRows?.length ?? 0) > 0) {
      const detailColumnWidth = (width - gap) / 2;
      const serviceRows = data.serviceDetailRows ?? [];
      const leftRows = serviceRows.filter((_, index) => index % 2 === 0);
      const rightRows = serviceRows.filter((_, index) => index % 2 === 1);

      const measureRowsHeight = (rows: Array<{ label: string; value: string }>) =>
        rows.reduce((sum, row) => {
          const valueHeight = doc
            .font(PDF_THEME.type.bodySmall.font)
            .fontSize(PDF_THEME.type.bodySmall.size)
            .heightOfString(sanitizePdfText(row.value), {
              width: detailColumnWidth - 40,
              lineGap: 1.7,
            });
          return sum + 22 + valueHeight;
        }, 0);

      const serviceCardHeight =
        22 + Math.max(measureRowsHeight(leftRows), measureRowsHeight(rightRows)) + 16;

      y = ensurePageSpace(doc, y, serviceCardHeight + 14, layout);

      drawSectionCard(doc, {
        x: left,
        y,
        width,
        height: serviceCardHeight,
        fill: PDF_THEME.colors.card,
        border: PDF_THEME.colors.border,
        borderWidth: 0.8,
        radius: PDF_THEME.radius.card,
      });
      doc
        .font(PDF_THEME.type.cardTitle.font)
        .fontSize(PDF_THEME.type.cardTitle.size)
        .fillColor(PDF_THEME.colors.muted);
      doc.text("LEISTUNGSDETAILS", left + 14, y + 12);

      const drawServiceColumn = (
        rows: Array<{ label: string; value: string }>,
        startX: number,
      ) => {
        let currentY = y + 28;
        rows.forEach((row) => {
          currentY = drawLabelValue(doc, {
            label: row.label,
            value: row.value,
            x: startX,
            y: currentY,
            width: detailColumnWidth - 20,
            labelFontSize: 7.2,
            valueFontSize: 8.8,
            gap: 2,
            lineGap: 1.55,
          });
          currentY += 8;
        });
      };

      drawServiceColumn(leftRows, left + 14);
      drawServiceColumn(rightRows, left + detailColumnWidth + gap + 14);
      y += serviceCardHeight + 14;
    }

    if (data.description) {
      const descriptionText = sanitizePdfText(data.description);
      const cardH =
        28 +
        doc.font("Helvetica").fontSize(8.8).heightOfString(descriptionText, {
          width: width - 28,
          lineGap: 1.6,
        }) +
        12;
      y = ensurePageSpace(doc, y, cardH + 14, layout);
      drawSectionCard(doc, {
        x: left,
        y,
        width,
        height: cardH,
        fill: PDF_THEME.colors.card,
        border: PDF_THEME.colors.border,
        borderWidth: 0.8,
        radius: PDF_THEME.radius.card,
      });
      doc.font(PDF_THEME.type.cardTitle.font).fontSize(PDF_THEME.type.cardTitle.size).fillColor(PDF_THEME.colors.muted);
      doc.text("LEISTUNGSBESCHREIBUNG", left + 14, y + 12);
      drawBodyText(doc, descriptionText, left + 14, y + 24, width - 28, {
        size: 8.8,
        lineGap: 1.6,
        color: PDF_THEME.colors.body,
      });
      y += cardH + 14;
    }

    y = ensurePageSpace(doc, y, 48, layout);
    y = drawSectionHeading(doc, "Leistungsübersicht", left, y, width);

    const rows = (data.lineItems ?? []).map((item) => ({
      name: [item.name, ...(item.detailLines ?? [])]
        .filter(Boolean)
        .map((line, index) => (index === 0 ? line : `• ${line}`))
        .join("\n"),
      quantity: item.quantity ?? 1,
      unit: item.unit || "Paket",
      total: item.priceCents ?? 0,
    }));
    const columns: TableColumn<(typeof rows)[number]>[] = [
      { key: "name", header: "Beschreibung", width: 312, value: (row) => row.name },
      { key: "quantity", header: "Menge", width: 58, align: "center", value: (row) => String(row.quantity) },
      { key: "unit", header: "Einheit", width: 70, align: "center", value: (row) => row.unit },
      { key: "total", header: "Gesamt", width: width - 312 - 58 - 70, align: "right", value: (row) => eur(row.total) },
    ];

    y = drawTable({
      doc,
      y,
      layout,
      x: left,
      width,
      columns,
      rows,
      card: true,
      zebra: true,
    });

    y += 14;
    y = ensurePageSpace(doc, y, 170, layout);
    const bottomGap = 14;
    const statusW = 176;
    const totalsW = width - statusW - bottomGap;
    const blockH = 92;

    y = drawSectionHeading(doc, "Rechnungsbetrag", left, y, width);
    drawSectionCard(doc, {
      x: left,
      y,
      width: statusW,
      height: blockH,
      fill: PDF_THEME.colors.card,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });
    drawSectionCard(doc, {
      x: left + statusW + bottomGap,
      y,
      width: totalsW,
      height: blockH,
      fill: PDF_THEME.colors.panel,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });

    const outstanding = Math.max(0, data.grossCents - data.paidCents);
    doc.font("Helvetica-Bold").fontSize(8.8).fillColor(data.paidCents > 0 ? PDF_THEME.colors.danger : PDF_THEME.colors.brand);
    doc.text(data.paidCents > 0 ? "Offener Betrag" : "Zahlungsziel", left + 16, y + 16);
    doc.font(PDF_THEME.type.total.font).fontSize(14.5).fillColor(PDF_THEME.colors.ink);
    doc.text(data.paidCents > 0 ? eur(outstanding) : fmtDate(data.dueAt), left + 16, y + 34, { width: statusW - 32 });
    doc.font("Helvetica").fontSize(8.1).fillColor(PDF_THEME.colors.muted);
    doc.text(
      data.paidCents > 0 ? `Bereits bezahlt: ${eur(data.paidCents)}` : "Bitte fristgerecht überweisen.",
      left + 16,
      y + 60,
      { width: statusW - 32, lineGap: 1.5 },
    );

    let totalsY = y + 16;
    [
      ["Nettobetrag", eur(data.netCents)],
      ["MwSt.", eur(data.vatCents)],
      ["Gesamtbetrag", eur(data.grossCents)],
    ].forEach(([label, value], index) => {
      doc
        .font(index === 2 ? "Helvetica-Bold" : "Helvetica")
        .fontSize(index === 2 ? 10.2 : 8.7)
        .fillColor(index === 2 ? PDF_THEME.colors.ink : PDF_THEME.colors.body);
      doc.text(label, left + statusW + bottomGap + 16, totalsY);
      doc.text(value, left + statusW + bottomGap + 16, totalsY, { width: totalsW - 32, align: "right" });
      totalsY += index === 1 ? 18 : 14;
      if (index === 1) {
        doc
          .strokeColor(PDF_THEME.colors.border)
          .lineWidth(0.65)
          .moveTo(left + statusW + bottomGap + 16, totalsY - 6)
          .lineTo(left + width - 16, totalsY - 6)
          .stroke();
      }
    });

    y += blockH + 14;

    const paymentNoticeText = sanitizePdfText(data.notes?.trim() || PAYMENT_NOTICE);
    const noticeH =
      28 +
      doc.font("Helvetica").fontSize(8.9).heightOfString(paymentNoticeText, {
        width: width - 32,
        lineGap: 1.5,
      }) +
      8;
    y = ensurePageSpace(doc, y, noticeH + 14, layout);
    drawSectionCard(doc, {
      x: left,
      y,
      width,
      height: noticeH,
      fill: PDF_THEME.colors.warnBg,
      border: PDF_THEME.colors.warnBorder,
      borderWidth: 0.9,
      radius: PDF_THEME.radius.card,
    });
    doc.font(PDF_THEME.type.cardTitle.font).fontSize(7.5).fillColor("#9a6700");
    doc.text("ZAHLUNGSBEDINGUNGEN", left + 16, y + 12);
    drawBodyText(doc, paymentNoticeText, left + 16, y + 27, width - 32, {
      size: 8.6,
      lineGap: 1.5,
      color: PDF_THEME.colors.ink,
    });
    renderFooterOnAllPages(doc);
    doc.end();
  });
}

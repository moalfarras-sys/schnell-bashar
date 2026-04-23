import PDFDocument from "pdfkit";
import path from "path";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { existsSync } from "fs";
import {
  cleanDisplayText,
  formatAddress,
  normalizeContactFields,
} from "@/lib/documents/formatting";
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
  measureTextBlock,
  pdfContentWidth,
  pdfPageLayout,
  renderFooterCompactOnAllPages,
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

type InvoiceLayoutMode = "compact-single-page" | "standard-flow";
type InvoiceSpacingProfile = {
  compact: boolean;
  pageTop: number;
  footerHeight: number;
  safeBottomPad: number;
  sectionGap: number;
  cardPadX: number;
  cardPadY: number;
  cardTitleGap: number;
  labelGap: number;
  detailRowGap: number;
  tableHeaderHeight: number;
  tableRowPaddingY: number;
  tableOuterPad: number;
  totalsHeadingGap: number;
  totalsHeight: number;
  paymentTitleGap: number;
  paymentTextGap: number;
};

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

const STANDARD_PROFILE: InvoiceSpacingProfile = {
  compact: false,
  pageTop: PDF_THEME.invoiceLayout.standard.pageTop,
  footerHeight: PDF_THEME.invoiceLayout.standard.footerHeight,
  safeBottomPad: PDF_THEME.invoiceLayout.standard.safeBottomPad,
  sectionGap: PDF_THEME.invoiceLayout.standard.sectionGap,
  cardPadX: 14,
  cardPadY: 12,
  cardTitleGap: 15,
  labelGap: 4,
  detailRowGap: 8,
  tableHeaderHeight: 22,
  tableRowPaddingY: 6,
  tableOuterPad: 6,
  totalsHeadingGap: 18,
  totalsHeight: 92,
  paymentTitleGap: 15,
  paymentTextGap: 27,
};

const COMPACT_PROFILE: InvoiceSpacingProfile = {
  compact: true,
  pageTop: PDF_THEME.invoiceLayout.compact.pageTop,
  footerHeight: PDF_THEME.invoiceLayout.compact.footerHeight,
  safeBottomPad: PDF_THEME.invoiceLayout.compact.safeBottomPad,
  sectionGap: PDF_THEME.invoiceLayout.compact.sectionGap,
  cardPadX: 12,
  cardPadY: 10,
  cardTitleGap: 12,
  labelGap: 2,
  detailRowGap: 5,
  tableHeaderHeight: PDF_THEME.invoiceLayout.compact.compactTableHeaderHeight,
  tableRowPaddingY: PDF_THEME.invoiceLayout.compact.compactTableRowPaddingY,
  tableOuterPad: 4,
  totalsHeadingGap: 14,
  totalsHeight: 82,
  paymentTitleGap: 13,
  paymentTextGap: 24,
};

function buildReferences(data: InvoiceData): [string, string][] {
  if (data.manualReferenceRows && data.manualReferenceRows.length > 0) {
    return data.manualReferenceRows
      .map((row) => {
        const label = cleanDisplayText(row.label);
        const value = cleanDisplayText(row.value, { allowInternalIdentifier: false });
        return label && value ? ([label, value] as [string, string]) : null;
      })
      .filter((row): row is [string, string] => Boolean(row));
  }
  return [
    cleanDisplayText(data.orderNo, { allowInternalIdentifier: false })
      ? ["Auftrag", cleanDisplayText(data.orderNo, { allowInternalIdentifier: false })!]
      : null,
    cleanDisplayText(data.offerNo, { allowInternalIdentifier: false })
      ? ["Angebot", cleanDisplayText(data.offerNo, { allowInternalIdentifier: false })!]
      : null,
    cleanDisplayText(data.contractNo, { allowInternalIdentifier: false })
      ? ["Vertrag", cleanDisplayText(data.contractNo, { allowInternalIdentifier: false })!]
      : null,
  ].filter(Boolean) as [string, string][];
}

function buildTableRows(data: InvoiceData) {
  return (data.lineItems ?? []).map((item) => ({
    name: cleanDisplayText(item.name) || "Position",
    detailLines: (item.detailLines ?? [])
      .map((line) => cleanDisplayText(line))
      .filter((line): line is string => Boolean(line)),
    quantity: item.quantity ?? 1,
    unit: cleanDisplayText(item.unit) || "Paket",
    total: item.priceCents ?? 0,
  }));
}

function compactTableCellText(row: { name: string; detailLines: string[] }) {
  return [row.name, ...row.detailLines.filter(Boolean).map((line) => `• ${line}`)].join("\n");
}

function safeDocumentNumber(value: string | undefined, fallback: string) {
  return cleanDisplayText(value, { allowInternalIdentifier: false }) || fallback;
}

function measureHeaderHeight(doc: PDFKit.PDFDocument, width: number, profile: InvoiceSpacingProfile) {
  const headerY = profile.compact
    ? PDF_THEME.invoiceLayout.compact.topOffset
    : PDF_THEME.invoiceLayout.standard.topOffset;
  const result = drawPageHeader(doc, {
    y: headerY,
    contentWidth: width,
    title: "RECHNUNG",
    documentTag: "ABRECHNUNG",
    metaRows: [
      { label: "Rechnungsnr.", value: "RE-00000000-000" },
      { label: "Datum", value: "11.04.2026" },
      { label: "Fällig", value: "25.04.2026" },
    ],
    companyLines: [
      { text: "Schnell Sicher Umzug", bold: true },
      { text: "Anzengruber Straße 9, 12043 Berlin" },
      { text: "Tel.: +49 172 9573681" },
      { text: "kontakt@schnellsicherumzug.de" },
      { text: "USt-IdNr.: DE454603297" },
    ],
    compact: profile.compact,
  });
  return result - headerY;
}

function measureInfoCardsHeight(
  doc: PDFKit.PDFDocument,
  width: number,
  data: InvoiceData,
  refs: [string, string][],
  profile: InvoiceSpacingProfile,
) {
  const gap = 14;
  const colW = (width - gap) / 2;
  const leftCardLines = [
    data.customerName,
    data.address,
    data.customerPhone ? `Tel.: ${data.customerPhone}` : null,
    `E-Mail: ${data.customerEmail}`,
  ].filter(Boolean) as string[];

  const lineFontSize = profile.compact ? 8.25 : 8.9;
  const firstLineSize = profile.compact ? 9.45 : 10.4;

  const leftCardHeight =
    profile.cardPadY * 2 +
    profile.cardTitleGap +
    leftCardLines.reduce((sum, line, index) => {
      const block = measureTextBlock(doc, line, colW - profile.cardPadX * 2, {
        font: index === 0 ? "Helvetica-Bold" : "Helvetica",
        fontSize: index === 0 ? firstLineSize : lineFontSize,
        lineGap: profile.compact ? 1.35 : 1.55,
      });
      return sum + block + (profile.compact ? 2 : 4);
    }, 0);

  const refsCardHeight = refs.length
    ? profile.cardPadY * 2 + profile.cardTitleGap + refs.length * (profile.compact ? 13 : 16)
    : profile.cardPadY * 2 + profile.cardTitleGap + (profile.compact ? 18 : 24);

  return Math.max(leftCardHeight, refsCardHeight);
}

function measureServiceDetailsHeight(
  doc: PDFKit.PDFDocument,
  width: number,
  serviceRows: Array<{ label: string; value: string }>,
  profile: InvoiceSpacingProfile,
) {
  if (serviceRows.length === 0) return 0;
  const gap = 14;
  const columnWidth = (width - gap) / 2;
  const leftRows = serviceRows.filter((_, index) => index % 2 === 0);
  const rightRows = serviceRows.filter((_, index) => index % 2 === 1);

  const columnHeight = (rows: Array<{ label: string; value: string }>) =>
    rows.reduce((sum, row) => {
      const labelHeight = measureTextBlock(doc, row.label, columnWidth - 20, {
        font: "Helvetica",
        fontSize: 7.1,
        lineGap: 1.25,
      });
      const valueHeight = measureTextBlock(doc, row.value, columnWidth - 20, {
        font: "Helvetica",
        fontSize: profile.compact ? 8.1 : 8.8,
        lineGap: profile.compact ? 1.35 : 1.55,
      });
      return sum + labelHeight + profile.labelGap + valueHeight + profile.detailRowGap;
    }, 0);

  return profile.cardPadY * 2 + profile.cardTitleGap + Math.max(columnHeight(leftRows), columnHeight(rightRows));
}

function measureDescriptionHeight(
  doc: PDFKit.PDFDocument,
  width: number,
  description: string | undefined,
  profile: InvoiceSpacingProfile,
) {
  if (!description) return 0;
  const textHeight = measureTextBlock(doc, description, width - profile.cardPadX * 2, {
    font: "Helvetica",
    fontSize: profile.compact ? 8.3 : 8.8,
    lineGap: profile.compact ? 1.45 : 1.6,
  });
  return profile.cardPadY * 2 + 12 + textHeight;
}

function measureTableHeight(
  doc: PDFKit.PDFDocument,
  width: number,
  rows: ReturnType<typeof buildTableRows>,
  profile: InvoiceSpacingProfile,
) {
  const columns: TableColumn<(typeof rows)[number]>[] = [
    {
      key: "name",
      header: "Beschreibung",
      width: 312,
      value: (row) => compactTableCellText(row),
      fontSize: profile.compact ? 7.9 : 8.5,
      lineGap: profile.compact ? 1.08 : 1.25,
    },
    { key: "quantity", header: "Menge", width: 58, align: "center", value: (row) => String(row.quantity) },
    { key: "unit", header: "Einheit", width: 70, align: "center", value: (row) => row.unit },
    {
      key: "total",
      header: "Gesamt",
      width: width - 312 - 58 - 70,
      align: "right",
      value: (row) => eur(row.total),
    },
  ];

  let bodyHeight = 0;
  for (const row of rows) {
    let rowHeight = 0;
    for (const column of columns) {
      const value = sanitizePdfText(column.value(row)) || " ";
      const blockHeight = measureTextBlock(doc, value, Math.max(12, column.width - 20), {
        font: column.font ?? PDF_THEME.type.table.font,
        fontSize: column.fontSize ?? PDF_THEME.type.table.size,
        lineGap: column.lineGap ?? PDF_THEME.type.table.lineGap,
      });
      rowHeight = Math.max(rowHeight, blockHeight);
    }
    bodyHeight += Math.max(profile.compact ? 18 : 22, Math.ceil(rowHeight + profile.tableRowPaddingY * 2)) + 4;
  }

  return profile.tableHeaderHeight + profile.tableOuterPad + bodyHeight + profile.tableOuterPad + 6;
}

function measurePaymentNoticeHeight(
  doc: PDFKit.PDFDocument,
  width: number,
  paymentText: string,
  profile: InvoiceSpacingProfile,
) {
  const textHeight = measureTextBlock(doc, paymentText, width - 32, {
    font: "Helvetica",
    fontSize: profile.compact ? 8.15 : 8.6,
    lineGap: profile.compact ? 1.35 : 1.5,
  });
  return profile.cardPadY * 2 + profile.paymentTitleGap + textHeight;
}

function chooseInvoiceLayoutMode(
  doc: PDFKit.PDFDocument,
  width: number,
  data: InvoiceData,
  refs: [string, string][],
  rows: ReturnType<typeof buildTableRows>,
  paymentText: string,
) {
  const profile = COMPACT_PROFILE;
  const serviceRows = data.serviceDetailRows ?? [];
  const contentHeight =
    measureHeaderHeight(doc, width, profile) +
    measureInfoCardsHeight(doc, width, data, refs, profile) +
    profile.sectionGap +
    (serviceRows.length > 0 ? measureServiceDetailsHeight(doc, width, serviceRows, profile) + profile.sectionGap : 0) +
    (data.description ? measureDescriptionHeight(doc, width, data.description, profile) + profile.sectionGap : 0) +
    profile.totalsHeadingGap +
    measureTableHeight(doc, width, rows, profile) +
    profile.sectionGap +
    profile.totalsHeight +
    profile.sectionGap +
    measurePaymentNoticeHeight(doc, width, paymentText, profile);

  const usableHeight =
    PDF_THEME.page.height -
    profile.pageTop -
    PDF_THEME.page.bottom -
    profile.footerHeight -
    profile.safeBottomPad;

  return contentHeight <= usableHeight ? "compact-single-page" : "standard-flow";
}

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
        Title: `Rechnung ${safeDocumentNumber(data.invoiceNo, "Rechnung")}`,
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
    const refs = buildReferences(data);
    const tableRows = buildTableRows(data);
    const paymentNoticeText = sanitizePdfText(data.notes?.trim() || PAYMENT_NOTICE);
    const mode = chooseInvoiceLayoutMode(doc, width, data, refs, tableRows, paymentNoticeText);
    const profile = mode === "compact-single-page" ? COMPACT_PROFILE : STANDARD_PROFILE;
    const layout = pdfPageLayout({
      top: profile.pageTop,
      footerHeight: profile.footerHeight,
      safeBottomPad: profile.safeBottomPad,
    });

    const logoPath =
      slotLogoPath && existsSync(slotLogoPath)
        ? slotLogoPath
        : path.join(process.cwd(), "public", "media", "brand", "hero-logo.jpeg");

    let y = drawPageHeader(doc, {
      y: profile.compact
        ? PDF_THEME.invoiceLayout.compact.topOffset
        : PDF_THEME.invoiceLayout.standard.topOffset,
      contentWidth: width,
      title: "RECHNUNG",
      documentTag: "ABRECHNUNG",
      metaRows: [
        { label: "Rechnungsnr.", value: safeDocumentNumber(data.invoiceNo, "Noch nicht vergeben") },
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
      compact: profile.compact,
    });

    const contacts = normalizeContactFields({
      email: data.customerEmail,
      phone: data.customerPhone,
    });
    const gap = 14;
    const colW = (width - gap) / 2;
    const leftCardLines = [
      cleanDisplayText(data.customerName, { kind: "name" }),
      formatAddress(data.address),
      contacts.phone ? `Tel.: ${contacts.phone}` : null,
      contacts.email ? `E-Mail: ${contacts.email}` : null,
    ].filter(Boolean) as string[];

    const leftCardHeight = measureInfoCardsHeight(doc, width, data, refs, profile);
    y = ensurePageSpace(doc, y, leftCardHeight + profile.sectionGap, layout);

    drawSectionCard(doc, {
      x: left,
      y,
      width: colW,
      height: leftCardHeight,
      fill: PDF_THEME.colors.card,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: profile.compact ? 12 : PDF_THEME.radius.card,
    });
    drawSectionCard(doc, {
      x: left + colW + gap,
      y,
      width: colW,
      height: leftCardHeight,
      fill: PDF_THEME.colors.card,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: profile.compact ? 12 : PDF_THEME.radius.card,
    });

    doc
      .font(PDF_THEME.type.cardTitle.font)
      .fontSize(profile.compact ? 6.8 : PDF_THEME.type.cardTitle.size)
      .fillColor(PDF_THEME.colors.muted);
    doc.text("RECHNUNGSEMPFÄNGER", left + profile.cardPadX, y + profile.cardPadY);
    doc.text("REFERENZEN", left + colW + gap + profile.cardPadX, y + profile.cardPadY);

    let leftY = y + profile.cardPadY + profile.cardTitleGap;
    leftCardLines.forEach((line, index) => {
      leftY = drawBodyText(doc, line, left + profile.cardPadX, leftY, colW - profile.cardPadX * 2, {
        size: index === 0 ? (profile.compact ? 9.45 : 10.4) : profile.compact ? 8.25 : 8.9,
        font: index === 0 ? "Helvetica-Bold" : "Helvetica",
        lineGap: profile.compact ? 1.35 : 1.55,
        color: PDF_THEME.colors.ink,
      });
      leftY += profile.compact ? 2 : 4;
    });

    let rightY = y + profile.cardPadY + profile.cardTitleGap;
    if (refs.length === 0) {
      doc.font("Helvetica").fontSize(profile.compact ? 7.6 : 8).fillColor(PDF_THEME.colors.muted);
      doc.text("Keine Referenzen gesetzt", left + colW + gap + profile.cardPadX, rightY, {
        width: colW - profile.cardPadX * 2,
      });
    } else {
      refs.forEach(([label, value]) => {
        doc.font("Helvetica").fontSize(profile.compact ? 7.1 : 7.5).fillColor(PDF_THEME.colors.muted);
        doc.text(label, left + colW + gap + profile.cardPadX, rightY, { width: 60 });
        doc
          .font("Helvetica-Bold")
          .fontSize(profile.compact ? 8.2 : 8.9)
          .fillColor(PDF_THEME.colors.ink);
        doc.text(value, left + colW + gap + 76, rightY, {
          width: colW - 90,
          align: "right",
        });
        rightY += profile.compact ? 13 : 16;
      });
    }

    y += leftCardHeight + profile.sectionGap;

    if ((data.serviceDetailRows?.length ?? 0) > 0) {
      const serviceRows = data.serviceDetailRows ?? [];
      const detailColumnWidth = (width - gap) / 2;
      const leftRows = serviceRows.filter((_, index) => index % 2 === 0);
      const rightRows = serviceRows.filter((_, index) => index % 2 === 1);
      const serviceCardHeight = measureServiceDetailsHeight(doc, width, serviceRows, profile);

      y = ensurePageSpace(doc, y, serviceCardHeight + profile.sectionGap, layout);
      drawSectionCard(doc, {
        x: left,
        y,
        width,
        height: serviceCardHeight,
        fill: PDF_THEME.colors.card,
        border: PDF_THEME.colors.border,
        borderWidth: 0.8,
        radius: profile.compact ? 12 : PDF_THEME.radius.card,
      });
      doc
        .font(PDF_THEME.type.cardTitle.font)
        .fontSize(profile.compact ? 6.8 : PDF_THEME.type.cardTitle.size)
        .fillColor(PDF_THEME.colors.muted);
      doc.text("LEISTUNGSDETAILS", left + profile.cardPadX, y + profile.cardPadY);

      const drawServiceColumn = (rows: Array<{ label: string; value: string }>, startX: number) => {
        let currentY = y + profile.cardPadY + profile.cardTitleGap;
        rows.forEach((row) => {
          currentY = drawLabelValue(doc, {
            label: row.label,
            value: row.value,
            x: startX,
            y: currentY,
            width: detailColumnWidth - 20,
            labelFontSize: 7.1,
            valueFontSize: profile.compact ? 8.1 : 8.8,
            gap: profile.labelGap,
            lineGap: profile.compact ? 1.35 : 1.55,
          });
          currentY += profile.detailRowGap;
        });
      };

      drawServiceColumn(leftRows, left + profile.cardPadX);
      drawServiceColumn(rightRows, left + detailColumnWidth + gap + profile.cardPadX);
      y += serviceCardHeight + profile.sectionGap;
    }

    if (data.description) {
      const descriptionText = sanitizePdfText(data.description);
      const cardH = measureDescriptionHeight(doc, width, descriptionText, profile);
      y = ensurePageSpace(doc, y, cardH + profile.sectionGap, layout);
      drawSectionCard(doc, {
        x: left,
        y,
        width,
        height: cardH,
        fill: PDF_THEME.colors.card,
        border: PDF_THEME.colors.border,
        borderWidth: 0.8,
        radius: profile.compact ? 12 : PDF_THEME.radius.card,
      });
      doc
        .font(PDF_THEME.type.cardTitle.font)
        .fontSize(profile.compact ? 6.8 : PDF_THEME.type.cardTitle.size)
        .fillColor(PDF_THEME.colors.muted);
      doc.text("LEISTUNGSBESCHREIBUNG", left + profile.cardPadX, y + profile.cardPadY);
      drawBodyText(doc, descriptionText, left + profile.cardPadX, y + profile.cardPadY + 12, width - profile.cardPadX * 2, {
        size: profile.compact ? 8.3 : 8.8,
        lineGap: profile.compact ? 1.45 : 1.6,
        color: PDF_THEME.colors.body,
      });
      y += cardH + profile.sectionGap;
    }

    y = ensurePageSpace(doc, y, profile.totalsHeadingGap + 36, layout);
    y = drawSectionHeading(doc, "Leistungsübersicht", left, y, width);

    const columns: TableColumn<(typeof tableRows)[number]>[] = [
      {
        key: "name",
        header: "Beschreibung",
        width: 312,
        value: (row) => compactTableCellText(row),
        fontSize: profile.compact ? 7.9 : 8.5,
        lineGap: profile.compact ? 1.08 : 1.25,
      },
      { key: "quantity", header: "Menge", width: 58, align: "center", value: (row) => String(row.quantity) },
      { key: "unit", header: "Einheit", width: 70, align: "center", value: (row) => row.unit },
      {
        key: "total",
        header: "Gesamt",
        width: width - 312 - 58 - 70,
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
      rows: tableRows,
      card: true,
      zebra: true,
      headerHeight: profile.tableHeaderHeight,
      rowPaddingY: profile.tableRowPaddingY,
    });

    y += profile.sectionGap;

    const noticeH = measurePaymentNoticeHeight(doc, width, paymentNoticeText, profile);
    const totalsBlockHeight = profile.totalsHeadingGap + profile.totalsHeight + profile.sectionGap + noticeH;
    y = ensurePageSpace(doc, y, totalsBlockHeight, layout);

    y = drawSectionHeading(doc, "Rechnungsbetrag", left, y, width);

    const bottomGap = profile.compact ? 10 : 14;
    const statusW = profile.compact ? 160 : 176;
    const totalsW = width - statusW - bottomGap;
    const blockH = profile.totalsHeight;

    drawSectionCard(doc, {
      x: left,
      y,
      width: statusW,
      height: blockH,
      fill: PDF_THEME.colors.card,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: profile.compact ? 12 : PDF_THEME.radius.card,
    });
    drawSectionCard(doc, {
      x: left + statusW + bottomGap,
      y,
      width: totalsW,
      height: blockH,
      fill: PDF_THEME.colors.panel,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: profile.compact ? 12 : PDF_THEME.radius.card,
    });

    const outstanding = Math.max(0, data.grossCents - data.paidCents);
    doc
      .font("Helvetica-Bold")
      .fontSize(profile.compact ? 8.1 : 8.8)
      .fillColor(data.paidCents > 0 ? PDF_THEME.colors.danger : PDF_THEME.colors.brand);
    doc.text(data.paidCents > 0 ? "Offener Betrag" : "Zahlungsziel", left + 14, y + 13);
    doc.font(PDF_THEME.type.total.font).fontSize(profile.compact ? 13.1 : 14.5).fillColor(PDF_THEME.colors.ink);
    doc.text(data.paidCents > 0 ? eur(outstanding) : fmtDate(data.dueAt), left + 14, y + (profile.compact ? 30 : 34), {
      width: statusW - 28,
    });
    doc.font("Helvetica").fontSize(profile.compact ? 7.2 : 8.1).fillColor(PDF_THEME.colors.muted);
    doc.text(
      data.paidCents > 0 ? `Bereits bezahlt: ${eur(data.paidCents)}` : "Bitte fristgerecht überweisen.",
      left + 14,
      y + (profile.compact ? 53 : 60),
      { width: statusW - 28, lineGap: profile.compact ? 1.25 : 1.5 },
    );

    let totalsY = y + (profile.compact ? 13 : 16);
    [
      ["Nettobetrag", eur(data.netCents)],
      ["MwSt.", eur(data.vatCents)],
      ["Gesamtbetrag", eur(data.grossCents)],
    ].forEach(([label, value], index) => {
      doc
        .font(index === 2 ? "Helvetica-Bold" : "Helvetica")
        .fontSize(index === 2 ? (profile.compact ? 9.5 : 10.2) : profile.compact ? 8.1 : 8.7)
        .fillColor(index === 2 ? PDF_THEME.colors.ink : PDF_THEME.colors.body);
      doc.text(label, left + statusW + bottomGap + 14, totalsY);
      doc.text(value, left + statusW + bottomGap + 14, totalsY, {
        width: totalsW - 28,
        align: "right",
      });
      totalsY += index === 1 ? (profile.compact ? 15 : 18) : profile.compact ? 12 : 14;
      if (index === 1) {
        doc
          .strokeColor(PDF_THEME.colors.border)
          .lineWidth(0.6)
          .moveTo(left + statusW + bottomGap + 14, totalsY - (profile.compact ? 5 : 6))
          .lineTo(left + width - 14, totalsY - (profile.compact ? 5 : 6))
          .stroke();
      }
    });

    y += blockH + profile.sectionGap;

    drawSectionCard(doc, {
      x: left,
      y,
      width,
      height: noticeH,
      fill: PDF_THEME.colors.warnBg,
      border: PDF_THEME.colors.warnBorder,
      borderWidth: 0.9,
      radius: profile.compact ? 12 : PDF_THEME.radius.card,
    });
    doc.font(PDF_THEME.type.cardTitle.font).fontSize(profile.compact ? 7.1 : 7.5).fillColor("#9a6700");
    doc.text("ZAHLUNGSBEDINGUNGEN", left + 14, y + profile.cardPadY);
    drawBodyText(doc, paymentNoticeText, left + 14, y + profile.paymentTextGap, width - 28, {
      size: profile.compact ? 8.15 : 8.6,
      lineGap: profile.compact ? 1.35 : 1.5,
      color: PDF_THEME.colors.ink,
    });

    if (profile.compact) {
      renderFooterCompactOnAllPages(doc);
    } else {
      renderFooterOnAllPages(doc);
    }
    doc.end();
  });
}

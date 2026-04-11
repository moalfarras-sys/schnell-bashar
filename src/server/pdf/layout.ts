import type PDFDocument from "pdfkit";

type Doc = PDFKit.PDFDocument;

export const PDF_THEME = {
  page: {
    width: 595,
    height: 842,
    marginX: 34,
    top: 30,
    bottom: 30,
    footerHeight: 42,
  },
  invoiceLayout: {
    standard: {
      topOffset: 18,
      pageTop: 30,
      footerHeight: 42,
      safeBottomPad: 8,
      headerBandHeight: 100,
      headerRuleY: 96,
      bannerY: 118,
      bannerHeight: 60,
      afterHeaderGap: 16,
      sectionGap: 14,
      compactCardPaddingX: 14,
      compactCardPaddingY: 12,
      compactTableHeaderHeight: 22,
      compactTableRowPaddingY: 6,
    },
    compact: {
      topOffset: 12,
      pageTop: 22,
      footerHeight: 34,
      safeBottomPad: 4,
      headerBandHeight: 82,
      headerRuleY: 78,
      bannerY: 92,
      bannerHeight: 50,
      afterHeaderGap: 12,
      sectionGap: 10,
      compactCardPaddingX: 12,
      compactCardPaddingY: 10,
      compactTableHeaderHeight: 20,
      compactTableRowPaddingY: 4,
    },
  },
  colors: {
    brand: "#163f6f",
    brandStrong: "#0f3158",
    brandSoft: "#edf4fb",
    ink: "#142033",
    body: "#354457",
    muted: "#6f7f92",
    border: "#d7e1eb",
    divider: "#e6edf3",
    card: "#ffffff",
    panel: "#f8fbfd",
    warnBg: "#fff7e8",
    warnBorder: "#f0c36b",
    success: "#177245",
    danger: "#b42318",
  },
  type: {
    overline: { font: "Helvetica-Bold", size: 7.1, lineGap: 1.6 },
    title: { font: "Helvetica-Bold", size: 20.5, lineGap: 1.55 },
    sectionTitle: { font: "Helvetica-Bold", size: 14, lineGap: 1.6 },
    cardTitle: { font: "Helvetica-Bold", size: 7.2, lineGap: 1.4 },
    label: { font: "Helvetica", size: 7.4, lineGap: 1.4 },
    body: { font: "Helvetica", size: 9.1, lineGap: 1.9 },
    bodySmall: { font: "Helvetica", size: 8.3, lineGap: 1.6 },
    table: { font: "Helvetica", size: 8.5, lineGap: 1.25 },
    tableHeader: { font: "Helvetica-Bold", size: 7.8, lineGap: 1.2 },
    strong: { font: "Helvetica-Bold", size: 10.2, lineGap: 1.6 },
    total: { font: "Helvetica-Bold", size: 15.5, lineGap: 1.6 },
    legalTitle: { font: "Helvetica-Bold", size: 9.6, lineGap: 1.5 },
    legalBody: { font: "Helvetica", size: 8.15, lineGap: 1.85 },
    footer: { font: "Helvetica", size: 6.9, lineGap: 1.3 },
  },
  radius: {
    card: 14,
    pill: 999,
    row: 8,
  },
  space: {
    xxs: 4,
    xs: 6,
    sm: 10,
    md: 16,
    lg: 22,
    xl: 30,
  },
} as const;

export type PdfPageLayout = {
  top: number;
  bottom: number;
  pageHeight: number;
  footerHeight: number;
  safeBottomPad?: number;
};

export type TextMeasureOptions = {
  font?: string;
  fontSize?: number;
  lineGap?: number;
};

export type CompanyLine = {
  text: string;
  bold?: boolean;
};

export type HeaderMetaRow = {
  label: string;
  value: string;
};

export type TableColumn<T> = {
  key: string;
  header: string;
  width: number;
  align?: "left" | "center" | "right";
  value: (row: T) => string;
  font?: string;
  fontSize?: number;
  lineGap?: number;
  color?: string;
};

export type DrawTableOptions<T> = {
  doc: Doc;
  y: number;
  layout: PdfPageLayout;
  x: number;
  width: number;
  columns: TableColumn<T>[];
  rows: T[];
  rowPaddingY?: number;
  rowPaddingX?: number;
  headerHeight?: number;
  zebra?: boolean;
  card?: boolean;
  rowRadius?: number;
  onPageBreak?: () => void;
};

export function pdfPageLayout(input?: {
  top?: number;
  footerHeight?: number;
  safeBottomPad?: number;
}): PdfPageLayout {
  return {
    top: input?.top ?? PDF_THEME.page.top,
    bottom: PDF_THEME.page.bottom,
    pageHeight: PDF_THEME.page.height,
    footerHeight: input?.footerHeight ?? PDF_THEME.page.footerHeight,
    safeBottomPad: input?.safeBottomPad,
  };
}

export function pdfContentWidth(): number {
  return PDF_THEME.page.width - PDF_THEME.page.marginX * 2;
}

export function pdfSafeBottom(layout: PdfPageLayout): number {
  return layout.pageHeight - layout.bottom - layout.footerHeight - (layout.safeBottomPad ?? 8);
}

export function sanitizePdfText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

export function sanitizePdfParagraphs(value: unknown): string[] {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .split(/\n+/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
}

export function measureTextBlock(
  doc: Doc,
  text: string,
  width: number,
  options: TextMeasureOptions = {},
): number {
  const value = sanitizePdfText(text) || " ";
  const font = options.font ?? PDF_THEME.type.body.font;
  const fontSize = options.fontSize ?? PDF_THEME.type.body.size;
  const lineGap = options.lineGap ?? PDF_THEME.type.body.lineGap;
  doc.font(font).fontSize(fontSize);
  return doc.heightOfString(value, { width, lineGap });
}

export function ensurePageSpace(
  doc: Doc,
  currentY: number,
  requiredHeight: number,
  layout: PdfPageLayout,
): number {
  const safeBottom = pdfSafeBottom(layout);
  if (currentY + requiredHeight <= safeBottom) return currentY;
  doc.addPage();
  return layout.top;
}

export function drawSectionCard(
  doc: Doc,
  input: {
    x: number;
    y: number;
    width: number;
    height: number;
    radius?: number;
    fill: string;
    border: string;
    borderWidth?: number;
  },
) {
  doc.save();
  doc
    .roundedRect(input.x, input.y, input.width, input.height, input.radius ?? PDF_THEME.radius.card)
    .fill(input.fill);
  doc
    .roundedRect(input.x, input.y, input.width, input.height, input.radius ?? PDF_THEME.radius.card)
    .strokeColor(input.border)
    .lineWidth(input.borderWidth ?? 0.75)
    .stroke();
  doc.restore();
}

export function drawLabelValue(
  doc: Doc,
  input: {
    label: string;
    value: string;
    x: number;
    y: number;
    width: number;
    labelFont?: string;
    valueFont?: string;
    labelFontSize?: number;
    valueFontSize?: number;
    labelColor?: string;
    valueColor?: string;
    gap?: number;
    lineGap?: number;
  },
): number {
  const label = sanitizePdfText(input.label);
  const value = sanitizePdfText(input.value);
  const lineGap = input.lineGap ?? 1.4;
  const labelFont = input.labelFont ?? PDF_THEME.type.label.font;
  const valueFont = input.valueFont ?? PDF_THEME.type.body.font;
  const labelFontSize = input.labelFontSize ?? PDF_THEME.type.label.size;
  const valueFontSize = input.valueFontSize ?? PDF_THEME.type.body.size;
  const gap = input.gap ?? 4;

  doc.font(labelFont).fontSize(labelFontSize).fillColor(input.labelColor ?? PDF_THEME.colors.muted);
  doc.text(label || " ", input.x, input.y, { width: input.width, lineGap });
  const labelHeight = doc.heightOfString(label || " ", { width: input.width, lineGap });

  const valueY = input.y + labelHeight + gap;
  doc.font(valueFont).fontSize(valueFontSize).fillColor(input.valueColor ?? PDF_THEME.colors.ink);
  doc.text(value || " ", input.x, valueY, { width: input.width, lineGap });
  const valueHeight = doc.heightOfString(value || " ", { width: input.width, lineGap });

  return valueY + valueHeight;
}

export function drawPageHeader(
  doc: Doc,
  input: {
    y: number;
    contentWidth: number;
    title: string;
    metaRows: HeaderMetaRow[];
    logoPath?: string | null;
    companyLines: CompanyLine[];
    documentTag?: string;
    compact?: boolean;
  },
): number {
  const left = PDF_THEME.page.marginX;
  const right = left + input.contentWidth;
  const mode = input.compact ? PDF_THEME.invoiceLayout.compact : PDF_THEME.invoiceLayout.standard;
  const logoW = input.compact ? 88 : 98;
  const logoH = input.compact ? 60 : 72;
  const headerTop = input.y;

  doc.save();
  doc.rect(0, 0, PDF_THEME.page.width, mode.headerBandHeight).fill("#fbfdff");
  doc.rect(0, mode.headerRuleY, PDF_THEME.page.width, 4).fill(PDF_THEME.colors.brand);
  doc.restore();

  if (input.logoPath) {
    try {
      doc.image(input.logoPath, left, headerTop + 6, { fit: [logoW, logoH] });
    } catch {
      doc.font("Helvetica-Bold").fontSize(14).fillColor(PDF_THEME.colors.brand);
      doc.text("Schnell Sicher Umzug", left, headerTop + 22);
    }
  } else {
    doc.font("Helvetica-Bold").fontSize(14).fillColor(PDF_THEME.colors.brand);
    doc.text("Schnell Sicher Umzug", left, headerTop + 22);
  }

  let companyY = headerTop + (input.compact ? 1 : 2);
  const companyX = right - 210;
  for (const line of input.companyLines) {
    doc
      .font(line.bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(line.bold ? (input.compact ? 8.9 : 9.5) : input.compact ? 7.4 : 8)
      .fillColor(line.bold ? PDF_THEME.colors.ink : PDF_THEME.colors.muted);
    doc.text(sanitizePdfText(line.text), companyX, companyY, { width: 210, align: "right" });
    companyY += line.bold ? (input.compact ? 11 : 12) : input.compact ? 9 : 10;
  }

  const bannerY = mode.bannerY;
  const bannerH = mode.bannerHeight;
  drawSectionCard(doc, {
    x: left,
    y: bannerY,
    width: input.contentWidth,
    height: bannerH,
    fill: PDF_THEME.colors.card,
    border: PDF_THEME.colors.border,
    borderWidth: 0.85,
    radius: 18,
  });

  if (input.documentTag) {
    doc.font(PDF_THEME.type.overline.font).fontSize(PDF_THEME.type.overline.size).fillColor(PDF_THEME.colors.muted);
    doc.text(input.documentTag, left + 18, bannerY + (input.compact ? 8 : 10), {
      width: 160,
      characterSpacing: 0.9,
    });
  }

  doc
    .font(PDF_THEME.type.title.font)
    .fontSize(input.compact ? 17.8 : PDF_THEME.type.title.size)
    .fillColor(PDF_THEME.colors.brand);
  doc.text(sanitizePdfText(input.title), left + 18, bannerY + (input.compact ? 16 : 20), {
    width: 240,
  });

  const metaX = right - 200;
  let metaY = bannerY + (input.compact ? 9 : 12);
  for (const row of input.metaRows) {
    doc.font("Helvetica").fontSize(input.compact ? 7.2 : 7.7).fillColor(PDF_THEME.colors.muted);
    doc.text(sanitizePdfText(row.label), metaX, metaY, { width: 70 });
    doc.font("Helvetica-Bold").fontSize(input.compact ? 8.2 : 8.8).fillColor(PDF_THEME.colors.ink);
    doc.text(sanitizePdfText(row.value), metaX + 74, metaY, { width: 112, align: "right" });
    metaY += input.compact ? 11.5 : 13;
  }

  return bannerY + bannerH + mode.afterHeaderGap;
}

export function drawSectionHeading(doc: Doc, label: string, x: number, y: number, width: number): number {
  doc.font(PDF_THEME.type.sectionTitle.font).fontSize(PDF_THEME.type.sectionTitle.size).fillColor(PDF_THEME.colors.ink);
  doc.text(sanitizePdfText(label), x, y, { width });
  return y + 18;
}

export function drawBodyText(
  doc: Doc,
  text: string,
  x: number,
  y: number,
  width: number,
  options?: {
    font?: string;
    size?: number;
    color?: string;
    lineGap?: number;
    align?: "left" | "center" | "right" | "justify";
  },
): number {
  const value = sanitizePdfText(text) || " ";
  const font = options?.font ?? PDF_THEME.type.body.font;
  const size = options?.size ?? PDF_THEME.type.body.size;
  const lineGap = options?.lineGap ?? PDF_THEME.type.body.lineGap;
  doc.font(font).fontSize(size).fillColor(options?.color ?? PDF_THEME.colors.body);
  doc.text(value, x, y, { width, lineGap, align: options?.align });
  return y + doc.heightOfString(value, { width, lineGap, align: options?.align });
}

export function drawParagraphs(
  doc: Doc,
  paragraphs: string[],
  x: number,
  y: number,
  width: number,
  options?: {
    font?: string;
    size?: number;
    color?: string;
    lineGap?: number;
    paragraphGap?: number;
    align?: "left" | "center" | "right" | "justify";
  },
): number {
  let currentY = y;
  for (const paragraph of paragraphs) {
    currentY = drawBodyText(doc, paragraph, x, currentY, width, options);
    currentY += options?.paragraphGap ?? 6;
  }
  return currentY;
}

export function drawFooter(doc: Doc, input?: { centeredNote?: string }) {
  const x = PDF_THEME.page.marginX;
  const y = PDF_THEME.page.height - PDF_THEME.page.bottom - PDF_THEME.page.footerHeight;
  const width = pdfContentWidth();
  doc.strokeColor(PDF_THEME.colors.border).lineWidth(0.6).moveTo(x, y).lineTo(x + width, y).stroke();
  doc.font(PDF_THEME.type.footer.font).fontSize(PDF_THEME.type.footer.size).fillColor(PDF_THEME.colors.muted);
  doc.text(
    sanitizePdfText(
      input?.centeredNote ||
        "Schnell Sicher Umzug · Anzengruber Straße 9, 12043 Berlin · Tel.: +49 172 9573681 · kontakt@schnellsicherumzug.de",
    ),
    x,
    y + 8,
    { width, align: "center" },
  );
  doc.text(
    "USt-IdNr.: DE454603297 · Berliner Sparkasse · IBAN: DE75 1005 0000 0191 5325 76 · BIC: BELADEBEXXX",
    x,
    y + 18,
    { width, align: "center" },
  );
}

export function drawFooterCompact(doc: Doc, input?: { centeredNote?: string }) {
  const x = PDF_THEME.page.marginX;
  const footerHeight = PDF_THEME.invoiceLayout.compact.footerHeight;
  const y = PDF_THEME.page.height - PDF_THEME.page.bottom - footerHeight;
  const width = pdfContentWidth();
  doc.strokeColor(PDF_THEME.colors.border).lineWidth(0.55).moveTo(x, y).lineTo(x + width, y).stroke();
  doc.font(PDF_THEME.type.footer.font).fontSize(6.35).fillColor(PDF_THEME.colors.muted);
  doc.text(
    sanitizePdfText(
      input?.centeredNote ||
        "Schnell Sicher Umzug · Anzengruber Straße 9, 12043 Berlin · Tel.: +49 172 9573681 · kontakt@schnellsicherumzug.de",
    ),
    x,
    y + 6,
    { width, align: "center" },
  );
  doc.text(
    "USt-IdNr.: DE454603297 · Berliner Sparkasse · IBAN: DE75 1005 0000 0191 5325 76 · BIC: BELADEBEXXX",
    x,
    y + 15,
    { width, align: "center" },
  );
}

export function renderFooterOnAllPages(doc: Doc, input?: { centeredNote?: string }) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    drawFooter(doc, input);
  }
}

export function renderFooterCompactOnAllPages(doc: Doc, input?: { centeredNote?: string }) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    drawFooterCompact(doc, input);
  }
}

function drawTableHeader<T>(doc: Doc, x: number, y: number, columns: TableColumn<T>[], headerHeight: number) {
  let currentX = x;
  doc.save();
  doc.roundedRect(x + 1, y + 1, columns.reduce((sum, col) => sum + col.width, 0) - 2, headerHeight, 11).fill(PDF_THEME.colors.brand);
  doc.restore();
  for (const column of columns) {
    doc.font(PDF_THEME.type.tableHeader.font).fontSize(PDF_THEME.type.tableHeader.size).fillColor("#ffffff");
    doc.text(column.header, currentX + 10, y + 7, {
      width: column.width - 20,
      align: column.align ?? "left",
    });
    currentX += column.width;
  }
}

function measureRowHeight<T>(
  doc: Doc,
  row: T,
  columns: TableColumn<T>[],
  rowPaddingY: number,
  rowPaddingX: number,
) {
  let height = 0;
  for (const column of columns) {
    const value = sanitizePdfText(column.value(row)) || " ";
    const font = column.font ?? PDF_THEME.type.table.font;
    const fontSize = column.fontSize ?? PDF_THEME.type.table.size;
    const lineGap = column.lineGap ?? PDF_THEME.type.table.lineGap;
    doc.font(font).fontSize(fontSize);
    height = Math.max(
      height,
      doc.heightOfString(value, {
        width: Math.max(12, column.width - rowPaddingX * 2),
        lineGap,
      }),
    );
  }
  return Math.max(22, Math.ceil(height + rowPaddingY * 2));
}

export function drawTable<T>(options: DrawTableOptions<T>): number {
  const {
    doc,
    x,
    width,
    columns,
    rows,
    layout,
    onPageBreak,
    rowPaddingY = 6,
    rowPaddingX = 10,
    headerHeight = 22,
    zebra = true,
    card = true,
    rowRadius = PDF_THEME.radius.row,
  } = options;

  let y = options.y;
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
  const normalizedColumns = totalWidth === width ? columns : columns.map((col) => ({ ...col }));

  function startTable(atY: number) {
    drawTableHeader(doc, x, atY, normalizedColumns, headerHeight);
    return atY + headerHeight + 6;
  }

  const rowHeights = rows.map((row) => measureRowHeight(doc, row, normalizedColumns, rowPaddingY, rowPaddingX));
  const bodyHeight = rowHeights.reduce((sum, value) => sum + value + 4, 0);
  const cardHeight = headerHeight + 8 + bodyHeight + 8;

  if (card) {
    drawSectionCard(doc, {
      x,
      y: y - 6,
      width,
      height: Math.max(headerHeight + 24, cardHeight),
      fill: PDF_THEME.colors.card,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });
  }

  y = startTable(y);

  rows.forEach((row, rowIndex) => {
    const rowHeight = rowHeights[rowIndex];
    if (y + rowHeight > pdfSafeBottom(layout)) {
      doc.addPage();
      onPageBreak?.();
      y = layout.top;
      if (card) {
        drawSectionCard(doc, {
          x,
          y: y - 6,
          width,
          height: Math.min(pdfSafeBottom(layout) - y - 2, headerHeight + rowHeight + 22),
          fill: PDF_THEME.colors.card,
          border: PDF_THEME.colors.border,
          borderWidth: 0.8,
          radius: PDF_THEME.radius.card,
        });
      }
      y = startTable(y);
    }

    if (zebra && rowIndex % 2 === 0) {
      doc.save();
      doc.roundedRect(x + 1, y, width - 2, rowHeight, rowRadius).fill(PDF_THEME.colors.brandSoft);
      doc.restore();
    }

    let currentX = x;
    for (const column of normalizedColumns) {
      const value = sanitizePdfText(column.value(row)) || " ";
      const font = column.font ?? PDF_THEME.type.table.font;
      const fontSize = column.fontSize ?? PDF_THEME.type.table.size;
      const lineGap = column.lineGap ?? PDF_THEME.type.table.lineGap;
      doc.font(font).fontSize(fontSize).fillColor(column.color ?? PDF_THEME.colors.ink);
      doc.text(value, currentX + rowPaddingX, y + rowPaddingY - 1, {
        width: column.width - rowPaddingX * 2,
        align: column.align ?? "left",
        lineGap,
      });
      currentX += column.width;
    }

    y += rowHeight + 4;
  });

  return y;
}

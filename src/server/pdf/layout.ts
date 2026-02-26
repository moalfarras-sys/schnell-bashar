import type PDFDocument from "pdfkit";

type Doc = PDFKit.PDFDocument;

export type PdfPageLayout = {
  top: number;
  bottom: number;
  pageHeight: number;
  footerHeight: number;
};

export type TextMeasureOptions = {
  font?: string;
  fontSize?: number;
  lineGap?: number;
};

export function sanitizePdfText(value: unknown): string {
  const text = String(value ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

export function measureTextBlock(
  doc: Doc,
  text: string,
  width: number,
  options: TextMeasureOptions = {},
): number {
  const value = sanitizePdfText(text);
  const font = options.font ?? "Helvetica";
  const fontSize = options.fontSize ?? 9;
  const lineGap = options.lineGap ?? 1.5;
  doc.font(font).fontSize(fontSize);
  return doc.heightOfString(value || " ", { width, lineGap });
}

export function ensurePageSpace(
  doc: Doc,
  currentY: number,
  requiredHeight: number,
  layout: PdfPageLayout,
): number {
  const safeBottom = layout.pageHeight - layout.bottom - layout.footerHeight - 10;
  if (currentY + requiredHeight <= safeBottom) return currentY;
  doc.addPage();
  return layout.top;
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
  const lineGap = input.lineGap ?? 1.5;
  const labelFont = input.labelFont ?? "Helvetica";
  const valueFont = input.valueFont ?? "Helvetica";
  const labelFontSize = input.labelFontSize ?? 7.5;
  const valueFontSize = input.valueFontSize ?? 9.5;
  const gap = input.gap ?? 4;

  doc.font(labelFont).fontSize(labelFontSize).fillColor(input.labelColor ?? "#64748b");
  doc.text(label || " ", input.x, input.y, { width: input.width, lineGap });
  const labelHeight = doc.heightOfString(label || " ", { width: input.width, lineGap });

  const valueY = input.y + labelHeight + gap;
  doc.font(valueFont).fontSize(valueFontSize).fillColor(input.valueColor ?? "#0f172a");
  doc.text(value || " ", input.x, valueY, { width: input.width, lineGap });
  const valueHeight = doc.heightOfString(value || " ", { width: input.width, lineGap });

  return valueY + valueHeight + 6;
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
    .roundedRect(input.x, input.y, input.width, input.height, input.radius ?? 6)
    .fill(input.fill);
  doc
    .roundedRect(input.x, input.y, input.width, input.height, input.radius ?? 6)
    .strokeColor(input.border)
    .lineWidth(input.borderWidth ?? 0.75)
    .stroke();
  doc.restore();
}


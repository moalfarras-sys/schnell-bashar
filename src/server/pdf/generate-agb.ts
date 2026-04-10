import PDFDocument from "pdfkit";
import path from "path";
import { existsSync } from "fs";
import { getImageSlot, publicSrcToAbsolute } from "@/server/content/slots";
import {
  PDF_THEME,
  drawBodyText,
  drawPageHeader,
  drawSectionCard,
  drawSectionHeading,
  ensurePageSpace,
  pdfContentWidth,
  pdfPageLayout,
  renderFooterOnAllPages,
  sanitizePdfParagraphs,
} from "@/server/pdf/layout";
import { MOVING_AGB_SECTIONS } from "@/server/pdf/legal";

export async function generateAGBPDF(): Promise<Buffer> {
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
        Title: "Allgemeine Geschäftsbedingungen – Schnell Sicher Umzug",
        Author: "Schnell Sicher Umzug",
        Subject: "AGB",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const layout = pdfPageLayout();
    const left = PDF_THEME.page.marginX;
    const width = pdfContentWidth();
    let y = drawPageHeader(doc, {
      y: 18,
      contentWidth: width,
      title: "Allgemeine Geschäftsbedingungen",
      documentTag: "RECHTLICHE HINWEISE",
      metaRows: [
        { label: "Version", value: "2026" },
        { label: "Stand", value: new Date().toLocaleDateString("de-DE") },
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

    drawSectionCard(doc, {
      x: left,
      y,
      width,
      height: 44,
      fill: PDF_THEME.colors.panel,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });
    y = drawBodyText(
      doc,
      "Diese Bedingungen regeln die Durchführung von Umzugs-, Transport-, Entsorgungs- und Zusatzleistungen. Für die Lesbarkeit wurden sie bewusst mit großzügigerem Zeilenabstand und sauberem Seitenfluss gestaltet.",
      left + 16,
      y + 12,
      width - 32,
      { size: 8.6, lineGap: 1.9, color: PDF_THEME.colors.body },
    );
    y += 18;

    for (const section of MOVING_AGB_SECTIONS) {
      const paragraphs = section.paragraphs.flatMap((paragraph) => sanitizePdfParagraphs(paragraph));
      const estimatedHeight =
        22 +
        paragraphs.reduce(
          (sum, paragraph) =>
            sum +
            doc
              .font(PDF_THEME.type.legalBody.font)
              .fontSize(PDF_THEME.type.legalBody.size)
              .heightOfString(paragraph, {
                width,
                lineGap: PDF_THEME.type.legalBody.lineGap,
                align: "justify",
              }) +
            8,
          0,
        );

      y = ensurePageSpace(doc, y, estimatedHeight, layout);
      drawSectionCard(doc, {
        x: left,
        y,
        width,
        height: Math.min(estimatedHeight + 10, PDF_THEME.page.height - y - PDF_THEME.page.bottom - PDF_THEME.page.footerHeight - 12),
        fill: PDF_THEME.colors.card,
        border: PDF_THEME.colors.border,
        borderWidth: 0.75,
        radius: PDF_THEME.radius.card,
      });

      let innerY = y + 14;
      innerY = drawSectionHeading(doc, `§ ${section.number} ${section.title}`, left + 16, innerY, width - 32);
      for (const paragraph of paragraphs) {
        innerY = drawBodyText(doc, paragraph, left + 16, innerY, width - 32, {
          size: PDF_THEME.type.legalBody.size,
          lineGap: PDF_THEME.type.legalBody.lineGap,
          color: PDF_THEME.colors.body,
          align: "justify",
        });
        innerY += 8;
      }
      y = innerY + 12;
    }

    renderFooterOnAllPages(doc);
    doc.end();
  });
}

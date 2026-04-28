import PDFDocument from "pdfkit";
import path from "path";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { existsSync } from "fs";
import {
  buildLineItemDescription,
  cleanDisplayText,
  formatAddress,
  normalizeContactFields,
} from "@/lib/documents/formatting";
import { resolveCompanyStampPath } from "@/server/pdf/company-seal-assets";
import { getImageSlots, publicSrcToAbsolute } from "@/server/content/slots";
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
  sanitizePdfText,
} from "@/server/pdf/layout";

export interface ContractData {
  contractId: string;
  contractNo?: string;
  offerNo?: string;
  orderNo?: string;
  contractDate: Date;
  signedAt?: Date;
  customerName: string;
  customerAddress?: string;
  customerPhone: string;
  customerEmail: string;
  moveFrom?: string;
  moveTo?: string;
  moveDate?: Date;
  floorFrom?: number;
  floorTo?: number;
  elevatorFrom?: boolean;
  elevatorTo?: boolean;
  notes?: string;
  services: Array<{
    name: string;
    description?: string;
    quantity?: number;
    unit?: string;
  }>;
  netCents: number;
  vatCents: number;
  grossCents: number;
  customerSignatureDataUrl?: string;
  customerSignedName?: string;
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

function metaValueOrFallback(value: unknown, fallback: string) {
  return cleanDisplayText(value, { allowInternalIdentifier: false }) || fallback;
}

const CONTRACT_PAYMENT_TERMS =
  "Die Zahlung spätestens 3 Tage vor dem Umzugstag per Überweisung oder am Umzugstag per Echtzeitüberweisung bzw. in bar: 50 % vor dem Beladen und 50 % vor dem Entladen.";

export async function generateContractPDF(data: ContractData): Promise<Buffer> {
  let slotLogoPath: string | null = null;
  let slotStampPath: string | null = null;
  try {
    const slotImages = await getImageSlots([
      { key: "img.pdf.brand.logo", fallbackSrc: "/media/brand/hero-logo.jpeg" },
      { key: "img.pdf.contract.stamp", fallbackSrc: "/media/brand/company-stamp-clean.png" },
    ]);
    slotLogoPath = publicSrcToAbsolute(slotImages["img.pdf.brand.logo"]?.src || "");
    slotStampPath = publicSrcToAbsolute(slotImages["img.pdf.contract.stamp"]?.src || "");
  } catch {
    slotLogoPath = null;
    slotStampPath = null;
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      bufferPages: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      info: {
        Title: `Umzugsvertrag ${metaValueOrFallback(data.contractNo || data.orderNo, "Umzugsvertrag")}`,
        Author: "Schnell Sicher Umzug",
        Subject: "Umzugsvertrag",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = PDF_THEME.page.marginX;
    const width = pdfContentWidth();
    const layout = pdfPageLayout({
      top: PDF_THEME.invoiceLayout.compact.pageTop,
      footerHeight: PDF_THEME.invoiceLayout.compact.footerHeight,
      safeBottomPad: PDF_THEME.invoiceLayout.compact.safeBottomPad,
    });
    const logoPath =
      slotLogoPath && existsSync(slotLogoPath)
        ? slotLogoPath
        : path.join(process.cwd(), "public", "media", "brand", "hero-logo.jpeg");

    let y = drawPageHeader(doc, {
      y: PDF_THEME.invoiceLayout.compact.topOffset,
      contentWidth: width,
      title: "UMZUGSVERTRAG",
      documentTag: "VERBINDLICHE VEREINBARUNG",
      metaRows: [
        { label: "Vertragsnr.", value: metaValueOrFallback(data.contractNo, "Noch nicht vergeben") },
        { label: "Angebot", value: data.offerNo || "—" },
        { label: "Auftrag", value: metaValueOrFallback(data.orderNo, "Noch offen") },
        { label: "Datum", value: fmtDate(data.signedAt || data.contractDate) },
      ],
      logoPath,
      companyLines: [
        { text: "Schnell Sicher Umzug", bold: true },
        { text: "Anzengruber Straße 9, 12043 Berlin" },
        { text: "Tel.: +49 172 9573681" },
        { text: "kontakt@schnellsicherumzug.de" },
        { text: "USt-IdNr.: DE454603297" },
      ],
      compact: true,
    });

    const gap = 14;
    const colW = (width - gap) / 2;
    const contractorLines = [
      "Schnell Sicher Umzug",
      "Anzengruber Straße 9, 12043 Berlin",
      "Tel.: +49 172 9573681",
      "kontakt@schnellsicherumzug.de",
    ];
    const customerContacts = normalizeContactFields({
      email: data.customerEmail,
      phone: data.customerPhone,
    });
    const customerLines = [
      cleanDisplayText(data.customerName, { kind: "name" }),
      formatAddress(data.customerAddress),
      customerContacts.phone ? `Tel.: ${customerContacts.phone}` : null,
      customerContacts.email ? `E-Mail: ${customerContacts.email}` : null,
    ].filter(Boolean) as string[];
    const partyCardH = Math.max(
      84,
      34 +
        Math.max(
          contractorLines.reduce(
            (sum, line) =>
              sum + doc.font("Helvetica").fontSize(8.8).heightOfString(sanitizePdfText(line), { width: colW - 28, lineGap: 1.55 }) + 4,
            0,
          ),
          customerLines.reduce(
            (sum, line) =>
              sum + doc.font("Helvetica").fontSize(8.8).heightOfString(sanitizePdfText(line), { width: colW - 28, lineGap: 1.55 }) + 4,
            0,
          ),
        ),
    );

    y = drawSectionHeading(doc, "Vertragsparteien", left, y, width);
    drawSectionCard(doc, {
      x: left,
      y,
      width: colW,
      height: partyCardH,
      fill: PDF_THEME.colors.card,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });
    drawSectionCard(doc, {
      x: left + colW + gap,
      y,
      width: colW,
      height: partyCardH,
      fill: PDF_THEME.colors.card,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });
    doc.font(PDF_THEME.type.cardTitle.font).fontSize(PDF_THEME.type.cardTitle.size).fillColor(PDF_THEME.colors.muted);
    doc.text("AUFTRAGNEHMER", left + 14, y + 12);
    doc.text("AUFTRAGGEBER", left + colW + gap + 14, y + 12);

    let partiesY = y + 28;
    contractorLines.forEach((line, index) => {
      partiesY = drawBodyText(doc, line, left + 14, partiesY, colW - 28, {
        size: index === 0 ? 10 : 8.8,
        font: index === 0 ? "Helvetica-Bold" : "Helvetica",
        lineGap: 1.55,
        color: PDF_THEME.colors.ink,
      });
      partiesY += 4;
    });
    let customerY = y + 28;
    customerLines.forEach((line, index) => {
      customerY = drawBodyText(doc, line, left + colW + gap + 14, customerY, colW - 28, {
        size: index === 0 ? 10 : 8.8,
        font: index === 0 ? "Helvetica-Bold" : "Helvetica",
        lineGap: 1.55,
        color: PDF_THEME.colors.ink,
      });
      customerY += 4;
    });
    y += partyCardH + 16;

    y = drawSectionHeading(doc, "§ 1 Vertragsgegenstand", left, y, width);
    const moveParagraphs = [
      data.moveFrom && data.moveTo
        ? `Umzug von ${formatAddress(data.moveFrom)} nach ${formatAddress(data.moveTo)}.`
        : "Vereinbarte Umzugs- und Zusatzleistungen.",
      [
        data.moveDate ? `Termin: ${fmtDate(data.moveDate)}` : null,
        data.floorFrom != null ? `Auszug: ${data.floorFrom}. Etage${data.elevatorFrom ? " mit Aufzug" : " ohne Aufzug"}` : null,
        data.floorTo != null ? `Einzug: ${data.floorTo}. Etage${data.elevatorTo ? " mit Aufzug" : " ohne Aufzug"}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    ].filter(Boolean);
    drawSectionCard(doc, {
      x: left,
      y,
      width,
      height:
        18 +
        moveParagraphs.reduce(
          (sum, paragraph) =>
            sum +
            doc.font("Helvetica").fontSize(8.15).heightOfString(paragraph, { width: width - 28, lineGap: 1.2 }) +
            5,
          0,
        ),
      fill: PDF_THEME.colors.card,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });
    let moveY = y + 14;
    moveParagraphs.forEach((paragraph) => {
      moveY = drawBodyText(doc, paragraph, left + 14, moveY, width - 28, {
        size: 8.15,
        lineGap: 1.2,
        color: PDF_THEME.colors.body,
      });
      moveY += 5;
    });
    y = moveY + 6;

    y = ensurePageSpace(doc, y, 150, layout);
    y = drawSectionHeading(doc, "§ 2 Leistungsumfang und Vergütung", left, y, width);
    const serviceSummary = data.services
      .slice(0, 4)
      .map((service) => {
        const title = buildLineItemDescription(service.name, service.description) || "Leistung";
        return `${service.quantity ?? 1} ${service.unit || "Pauschal"} - ${title}`;
      })
      .join("\n");
    const extraServices = data.services.length > 4 ? `\nWeitere Positionen: ${data.services.length - 4}` : "";
    const noteText = data.notes ? `\nHinweis: ${sanitizePdfText(data.notes).slice(0, 180)}` : "";
    const serviceText = `${serviceSummary || "Vereinbarte Umzugs- und Zusatzleistungen."}${extraServices}${noteText}`;
    const serviceH =
      34 +
      doc.font("Helvetica").fontSize(8.25).heightOfString(sanitizePdfText(serviceText), {
        width: width - 32,
        lineGap: 1.25,
      });
    drawSectionCard(doc, {
      x: left,
      y,
      width,
      height: serviceH,
      fill: PDF_THEME.colors.card,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });
    doc.font(PDF_THEME.type.cardTitle.font).fontSize(7.2).fillColor(PDF_THEME.colors.muted);
    doc.text("LEISTUNGEN", left + 16, y + 12);
    drawBodyText(doc, serviceText, left + 16, y + 25, width - 32, {
      size: 8.25,
      lineGap: 1.25,
      color: PDF_THEME.colors.body,
    });
    y += serviceH + 10;
    const priceCardH = 102;
    y = ensurePageSpace(doc, y, priceCardH + 12, layout);
    drawSectionCard(doc, {
      x: left,
      y,
      width,
      height: priceCardH,
      fill: PDF_THEME.colors.panel,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });
    doc.font(PDF_THEME.type.cardTitle.font).fontSize(7.2).fillColor(PDF_THEME.colors.muted);
    doc.text("VERGÜTUNG", left + 16, y + 12);
    doc.font(PDF_THEME.type.body.font).fontSize(8.4).fillColor(PDF_THEME.colors.body);
    doc.text("Nettobetrag", left + 16, y + 31);
    doc.text(eur(data.netCents), left + 16, y + 31, { width: width - 32, align: "right" });
    doc.text("MwSt. (19 %)", left + 16, y + 46);
    doc.text(eur(data.vatCents), left + 16, y + 46, { width: width - 32, align: "right" });
    doc.strokeColor(PDF_THEME.colors.border).lineWidth(0.65).moveTo(left + 16, y + 61).lineTo(left + width - 16, y + 61).stroke();
    doc.font(PDF_THEME.type.total.font).fontSize(13.2).fillColor(PDF_THEME.colors.ink);
    doc.text("Gesamtbetrag", left + 16, y + 65);
    doc.text(eur(data.grossCents), left + 16, y + 65, { width: width - 32, align: "right" });
    drawBodyText(doc, CONTRACT_PAYMENT_TERMS, left + 16, y + 83, width - 32, {
      size: 7.35,
      lineGap: 1.05,
      color: PDF_THEME.colors.body,
    });
    y += priceCardH + 8;

    y = ensurePageSpace(doc, y, 134, layout);
    y = drawSectionHeading(doc, "Unterschriften", left, y, width);
    const signatureCardH = 118;
    drawSectionCard(doc, {
      x: left,
      y,
      width,
      height: signatureCardH,
      fill: PDF_THEME.colors.card,
      border: PDF_THEME.colors.border,
      borderWidth: 0.8,
      radius: PDF_THEME.radius.card,
    });

    const sigGap = 24;
    const sigW = (width - sigGap - 32) / 2;
    const sigLineY = y + 76;
    doc.strokeColor(PDF_THEME.colors.border).lineWidth(0.8);
    doc.moveTo(left + 16, sigLineY).lineTo(left + 16 + sigW, sigLineY).stroke();
    doc.moveTo(left + 16 + sigW + sigGap, sigLineY).lineTo(left + width - 16, sigLineY).stroke();
    doc.font(PDF_THEME.type.cardTitle.font).fontSize(7.4).fillColor(PDF_THEME.colors.muted);
    doc.text("AUFTRAGNEHMER", left + 16, y + 16);
    doc.text("AUFTRAGGEBER", left + 16 + sigW + sigGap, y + 16);

    const stampPath = slotStampPath && existsSync(slotStampPath) ? slotStampPath : resolveCompanyStampPath();
    if (stampPath) {
      try {
        doc.image(stampPath, left + 28, y + 28, {
          fit: [112, 38],
          valign: "center",
        });
      } catch {
        doc.font("Helvetica-Bold").fontSize(13).fillColor(PDF_THEME.colors.brand);
        doc.text("Schnell Sicher Umzug", left + 28, y + 43);
      }
    } else {
      doc.font("Helvetica-Bold").fontSize(13).fillColor(PDF_THEME.colors.brand);
      doc.text("Schnell Sicher Umzug", left + 28, y + 43);
    }

    if (data.customerSignatureDataUrl) {
      try {
        const base64Data = data.customerSignatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
        const sigBuffer = Buffer.from(base64Data, "base64");
        doc.image(sigBuffer, left + 16 + sigW + sigGap + 8, y + 32, {
          fit: [sigW - 16, 32],
          valign: "center",
        });
      } catch {
        if (data.customerSignedName) {
          doc.font("Helvetica-Oblique").fontSize(13).fillColor(PDF_THEME.colors.ink);
          doc.text(data.customerSignedName, left + 16 + sigW + sigGap + 8, y + 45, { width: sigW - 16 });
        }
      }
    } else if (data.customerSignedName) {
      doc.font("Helvetica-Oblique").fontSize(13).fillColor(PDF_THEME.colors.ink);
      doc.text(data.customerSignedName, left + 16 + sigW + sigGap + 8, y + 45, { width: sigW - 16 });
    }

    doc.font("Helvetica").fontSize(8.1).fillColor(PDF_THEME.colors.body);
    doc.text(`Berlin, ${fmtDate(data.signedAt || data.contractDate)}`, left + 16, sigLineY + 8, { width: sigW });
    doc.text(`Berlin, ${fmtDate(data.signedAt || data.contractDate)}`, left + 16 + sigW + sigGap, sigLineY + 8, { width: sigW });
    doc.text("Schnell Sicher Umzug", left + 16, sigLineY + 22, { width: sigW });
    if (data.customerSignedName) {
      doc.text(data.customerSignedName, left + 16 + sigW + sigGap, sigLineY + 22, { width: sigW });
    }

    doc.font("Helvetica").fontSize(6.7).fillColor(PDF_THEME.colors.muted);
    doc.text(
      "Die AGB sind Bestandteil des Vertrags und werden als separates Dokument bereitgestellt.",
      left + 16,
      y + signatureCardH - 14,
      { width: width - 32, align: "center" },
    );

    y += signatureCardH + 10;

    renderFooterOnAllPages(doc);
    doc.end();
  });
}

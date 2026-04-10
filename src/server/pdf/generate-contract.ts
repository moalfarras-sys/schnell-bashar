import PDFDocument from "pdfkit";
import path from "path";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { existsSync } from "fs";
import { resolveCompanyStampPath } from "@/server/pdf/company-seal-assets";
import { getImageSlots, publicSrcToAbsolute } from "@/server/content/slots";
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
  sanitizePdfParagraphs,
  sanitizePdfText,
} from "@/server/pdf/layout";
import { MOVING_AGB_SECTIONS } from "@/server/pdf/legal";

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
        Title: `Umzugsvertrag ${data.orderNo || data.contractId}`,
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
    const layout = pdfPageLayout();
    const logoPath =
      slotLogoPath && existsSync(slotLogoPath)
        ? slotLogoPath
        : path.join(process.cwd(), "public", "media", "brand", "hero-logo.jpeg");

    let y = drawPageHeader(doc, {
      y: 18,
      contentWidth: width,
      title: "UMZUGSVERTRAG",
      documentTag: "VERBINDLICHE VEREINBARUNG",
      metaRows: [
        { label: "Vertragsnr.", value: data.contractNo || data.contractId },
        { label: "Angebot", value: data.offerNo || "—" },
        { label: "Auftrag", value: data.orderNo || "—" },
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
    });

    const gap = 14;
    const colW = (width - gap) / 2;
    const contractorLines = [
      "Schnell Sicher Umzug",
      "Anzengruber Straße 9, 12043 Berlin",
      "Tel.: +49 172 9573681",
      "kontakt@schnellsicherumzug.de",
    ];
    const customerLines = [
      data.customerName,
      data.customerAddress,
      `Tel.: ${data.customerPhone}`,
      data.customerEmail,
    ].filter(Boolean) as string[];
    const partyCardH = Math.max(
      104,
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
        ? `Der Auftragnehmer verpflichtet sich, den Umzug des Auftraggebers von ${data.moveFrom} nach ${data.moveTo} fachgerecht, sorgfältig und entsprechend der vereinbarten Leistungen durchzuführen.`
        : "Der Auftragnehmer verpflichtet sich, die vereinbarten Umzugs- und Zusatzleistungen fachgerecht und termingerecht auszuführen.",
      data.moveDate ? `Geplanter Umzugstermin: ${fmtDate(data.moveDate)}.` : "",
      data.floorFrom != null ? `Auszug: ${data.floorFrom}. Etage${data.elevatorFrom ? " mit Aufzug" : " ohne Aufzug"}.` : "",
      data.floorTo != null ? `Einzug: ${data.floorTo}. Etage${data.elevatorTo ? " mit Aufzug" : " ohne Aufzug"}.` : "",
    ].filter(Boolean);
    drawSectionCard(doc, {
      x: left,
      y,
      width,
      height:
        20 +
        moveParagraphs.reduce(
          (sum, paragraph) =>
            sum +
            doc.font("Helvetica").fontSize(8.9).heightOfString(paragraph, { width: width - 28, lineGap: 1.7, align: "justify" }) +
            8,
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
        size: 8.9,
        lineGap: 1.7,
        color: PDF_THEME.colors.body,
        align: "justify",
      });
      moveY += 8;
    });
    y = moveY + 8;

    y = ensurePageSpace(doc, y, 160, layout);
    y = drawSectionHeading(doc, "§ 2 Leistungsumfang und Vergütung", left, y, width);
    const serviceRows = data.services.map((service) => ({
      description: service.description ? `${service.name} · ${service.description}` : service.name,
      quantity: service.quantity ?? 1,
      unit: service.unit || "Pauschal",
    }));
    const columns: TableColumn<(typeof serviceRows)[number]>[] = [
      { key: "description", header: "Leistung", width: 332, value: (row) => row.description },
      { key: "quantity", header: "Menge", width: 62, align: "center", value: (row) => String(row.quantity) },
      { key: "unit", header: "Einheit", width: width - 332 - 62, align: "center", value: (row) => row.unit },
    ];
    y = drawTable({
      doc,
      y,
      layout,
      x: left,
      width,
      columns,
      rows: serviceRows,
      card: true,
      zebra: true,
    });

    y += 14;
    const priceCardH = 110;
    y = ensurePageSpace(doc, y, priceCardH + 14 + 76 + 16, layout);
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
    doc.font(PDF_THEME.type.cardTitle.font).fontSize(7.4).fillColor(PDF_THEME.colors.muted);
    doc.text("VERGÜTUNG", left + 16, y + 14);
    doc.font(PDF_THEME.type.body.font).fontSize(9).fillColor(PDF_THEME.colors.body);
    doc.text("Nettobetrag", left + 16, y + 38);
    doc.text(eur(data.netCents), left + 16, y + 38, { width: width - 32, align: "right" });
    doc.text("MwSt. (19 %)", left + 16, y + 56);
    doc.text(eur(data.vatCents), left + 16, y + 56, { width: width - 32, align: "right" });
    doc.strokeColor(PDF_THEME.colors.border).lineWidth(0.65).moveTo(left + 16, y + 76).lineTo(left + width - 16, y + 76).stroke();
    doc.font(PDF_THEME.type.total.font).fontSize(15).fillColor(PDF_THEME.colors.ink);
    doc.text("Gesamtbetrag", left + 16, y + 82);
    doc.text(eur(data.grossCents), left + 16, y + 82, { width: width - 32, align: "right" });
    y += priceCardH + 14;
    drawSectionCard(doc, {
      x: left,
      y,
      width,
      height: 62,
      fill: "#f8fbff",
      border: "#cfe0f1",
      borderWidth: 0.85,
      radius: PDF_THEME.radius.card,
    });
    doc.font(PDF_THEME.type.cardTitle.font).fontSize(7.4).fillColor(PDF_THEME.colors.brand);
    doc.text("ZAHLUNGSREGELUNG", left + 16, y + 14);
    drawBodyText(doc, CONTRACT_PAYMENT_TERMS, left + 16, y + 28, width - 32, {
      size: 8.8,
      lineGap: 1.7,
      color: PDF_THEME.colors.body,
      align: "justify",
    });
    y += 76;

    if (data.notes) {
      y = ensurePageSpace(doc, y, 70, layout);
      drawSectionCard(doc, {
        x: left,
        y,
        width,
        height:
          30 +
          doc.font("Helvetica").fontSize(8.8).heightOfString(sanitizePdfText(data.notes), { width: width - 28, lineGap: 1.6 }) +
          10,
        fill: PDF_THEME.colors.card,
        border: PDF_THEME.colors.border,
        borderWidth: 0.8,
        radius: PDF_THEME.radius.card,
      });
      doc.font(PDF_THEME.type.cardTitle.font).fontSize(7.4).fillColor(PDF_THEME.colors.muted);
      doc.text("BESONDERE HINWEISE", left + 16, y + 14);
      y = drawBodyText(doc, data.notes, left + 16, y + 28, width - 32, {
        size: 8.8,
        lineGap: 1.6,
        color: PDF_THEME.colors.body,
        align: "justify",
      });
      y += 16;
    }

    const legalSections = [
      {
        title: "§ 3 Pflichten des Auftraggebers",
        paragraphs: [
          "Der Auftraggeber stellt sicher, dass alle Zugangswege frei, sicher und begehbar sind. Er informiert rechtzeitig über Besonderheiten wie eingeschränkte Zufahrten, empfindliche Gegenstände oder gesonderte Sicherheitsanforderungen.",
          "Wertgegenstände, Bargeld, Schmuck, wichtige Dokumente und Datenträger werden vom Auftraggeber selbst transportiert.",
        ],
      },
      {
        title: "§ 4 Haftung",
        paragraphs: [
          "Der Auftragnehmer haftet für Schäden nur im Rahmen der gesetzlichen Vorschriften. Für nicht ordnungsgemäß verpackte Gegenstände oder nicht gemeldete Besonderheiten wird keine Haftung übernommen.",
        ],
      },
      {
        title: "§ 5 Stornierung und Rücktritt",
        paragraphs: [
          "Bei Rücktritt vor dem Umzugstermin gelten die in den AGB geregelten Stornostaffeln. Dem Kunden bleibt der Nachweis vorbehalten, dass ein geringerer Schaden entstanden ist.",
        ],
      },
      {
        title: "§ 6 Schlussbestimmungen",
        paragraphs: [
          "Es gilt das Recht der Bundesrepublik Deutschland. Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform. Gerichtsstand ist Berlin, soweit gesetzlich zulässig.",
        ],
      },
    ];

    for (const section of legalSections) {
      const estimatedHeight =
        26 +
        section.paragraphs.reduce(
          (sum, paragraph) =>
            sum +
            doc.font("Helvetica").fontSize(8.85).heightOfString(paragraph, {
              width,
              lineGap: 1.7,
              align: "justify",
            }) +
            8,
          0,
        );
      y = ensurePageSpace(doc, y, estimatedHeight, layout);
      y = drawSectionHeading(doc, section.title, left, y, width);
      drawSectionCard(doc, {
        x: left,
        y,
        width,
        height: estimatedHeight,
        fill: PDF_THEME.colors.card,
        border: PDF_THEME.colors.border,
        borderWidth: 0.8,
        radius: PDF_THEME.radius.card,
      });
      let innerY = y + 14;
      section.paragraphs.forEach((paragraph) => {
        innerY = drawBodyText(doc, paragraph, left + 16, innerY, width - 32, {
          size: 8.85,
          lineGap: 1.7,
          color: PDF_THEME.colors.body,
          align: "justify",
        });
        innerY += 8;
      });
      y = innerY + 10;
    }

    y = ensurePageSpace(doc, y, 170, layout);
    y = drawSectionHeading(doc, "Unterschriften", left, y, width);
    const signatureCardH = 138;
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
    const sigLineY = y + 88;
    doc.strokeColor(PDF_THEME.colors.border).lineWidth(0.8);
    doc.moveTo(left + 16, sigLineY).lineTo(left + 16 + sigW, sigLineY).stroke();
    doc.moveTo(left + 16 + sigW + sigGap, sigLineY).lineTo(left + width - 16, sigLineY).stroke();
    doc.font(PDF_THEME.type.cardTitle.font).fontSize(7.4).fillColor(PDF_THEME.colors.muted);
    doc.text("AUFTRAGNEHMER", left + 16, y + 18);
    doc.text("AUFTRAGGEBER", left + 16 + sigW + sigGap, y + 18);

    const stampPath = slotStampPath && existsSync(slotStampPath) ? slotStampPath : resolveCompanyStampPath();
    if (stampPath) {
      try {
        doc.image(stampPath, left + 24, y + 28, {
          fit: [120, 58],
          valign: "center",
        });
      } catch {
        doc.font("Helvetica-Bold").fontSize(13).fillColor(PDF_THEME.colors.brand);
        doc.text("Schnell Sicher Umzug", left + 24, y + 48);
      }
    } else {
      doc.font("Helvetica-Bold").fontSize(13).fillColor(PDF_THEME.colors.brand);
      doc.text("Schnell Sicher Umzug", left + 24, y + 48);
    }

    if (data.customerSignatureDataUrl) {
      try {
        const base64Data = data.customerSignatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
        const sigBuffer = Buffer.from(base64Data, "base64");
        doc.image(sigBuffer, left + 16 + sigW + sigGap + 8, y + 32, {
          fit: [sigW - 16, 46],
          valign: "center",
        });
      } catch {
        if (data.customerSignedName) {
          doc.font("Helvetica-Oblique").fontSize(13).fillColor(PDF_THEME.colors.ink);
          doc.text(data.customerSignedName, left + 16 + sigW + sigGap + 8, y + 50, { width: sigW - 16 });
        }
      }
    } else if (data.customerSignedName) {
      doc.font("Helvetica-Oblique").fontSize(13).fillColor(PDF_THEME.colors.ink);
      doc.text(data.customerSignedName, left + 16 + sigW + sigGap + 8, y + 50, { width: sigW - 16 });
    }

    doc.font("Helvetica").fontSize(8.1).fillColor(PDF_THEME.colors.body);
    doc.text(`Berlin, ${fmtDate(data.signedAt || data.contractDate)}`, left + 16, sigLineY + 8, { width: sigW });
    doc.text(`Berlin, ${fmtDate(data.signedAt || data.contractDate)}`, left + 16 + sigW + sigGap, sigLineY + 8, { width: sigW });
    doc.text("Schnell Sicher Umzug", left + 16, sigLineY + 22, { width: sigW });
    if (data.customerSignedName) {
      doc.text(data.customerSignedName, left + 16 + sigW + sigGap, sigLineY + 22, { width: sigW });
    }

    y += 22;
    y = ensurePageSpace(doc, y, 180, layout);
    y = drawSectionHeading(doc, "Allgemeine Geschäftsbedingungen", left, y, width);
    drawBodyText(
      doc,
      "Die nachfolgenden AGB sind Bestandteil des Vertrags. Sie sind mit bewusst ruhiger Typografie und klaren Abschnittswechseln gesetzt, damit sie auch im Ausdruck sauber lesbar bleiben.",
      left,
      y,
      width,
      { size: 8.8, lineGap: 1.7, color: PDF_THEME.colors.body },
    );
    y += 28;

    for (const section of MOVING_AGB_SECTIONS) {
      const paragraphs = section.paragraphs.flatMap((paragraph) => sanitizePdfParagraphs(paragraph));
      const estimatedHeight =
        24 +
        paragraphs.reduce(
          (sum, paragraph) =>
            sum +
            doc.font("Helvetica").fontSize(PDF_THEME.type.legalBody.size).heightOfString(paragraph, {
              width: width - 32,
              lineGap: PDF_THEME.type.legalBody.lineGap,
              align: "justify",
            }) +
            8,
          0,
        );
      y = ensurePageSpace(doc, y, estimatedHeight + 10, layout);
      drawSectionCard(doc, {
        x: left,
        y,
        width,
        height: estimatedHeight + 8,
        fill: PDF_THEME.colors.card,
        border: PDF_THEME.colors.border,
        borderWidth: 0.75,
        radius: PDF_THEME.radius.card,
      });
      let secY = y + 14;
      secY = drawSectionHeading(doc, `§ ${section.number} ${section.title}`, left + 16, secY, width - 32);
      paragraphs.forEach((paragraph) => {
        secY = drawBodyText(doc, paragraph, left + 16, secY, width - 32, {
          size: PDF_THEME.type.legalBody.size,
          lineGap: PDF_THEME.type.legalBody.lineGap,
          color: PDF_THEME.colors.body,
          align: "justify",
        });
        secY += 8;
      });
      y = secY + 10;
    }

    renderFooterOnAllPages(doc);
    doc.end();
  });
}

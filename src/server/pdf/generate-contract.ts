import PDFDocument from "pdfkit";
import path from "path";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { existsSync } from "fs";
import {
  resolveCompanyStampPath,
} from "@/server/pdf/company-seal-assets";
import { getImageSlots, publicSrcToAbsolute } from "@/server/content/slots";

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

const BLUE = "#1e3a8a";
const DARK = "#0f172a";
const BODY = "#334155";
const MUTED = "#64748b";
const LIGHT_BG = "#f8fafc";
const BORDER = "#e2e8f0";
const ACCENT = "#2563eb";
const TABLE_HEADER = "#1e3a8a";
const ACCENT_LIGHT = "#eff6ff";

const M = 60;
const W = 595;
const H = 842;
const LEFT = M;
const RIGHT = W - M;
const CW = RIGHT - LEFT;
const FOOTER_H = 32;
const SAFE_BOTTOM = H - M - FOOTER_H - 10;

export async function generateContractPDF(data: ContractData): Promise<Buffer> {
  const slotImages = await getImageSlots([
    { key: "img.pdf.brand.logo", fallbackSrc: "/media/brand/hero-logo.jpeg" },
    { key: "img.pdf.contract.stamp", fallbackSrc: "/media/brand/company-stamp-clean.png" },
  ]);
  const slotLogoPath = publicSrcToAbsolute(slotImages["img.pdf.brand.logo"]?.src || "");
  const slotStampPath = publicSrcToAbsolute(slotImages["img.pdf.contract.stamp"]?.src || "");

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

    let y = M;

    function ensureSpace(need: number) {
      if (y + need > SAFE_BOTTOM) {
        doc.addPage();
        y = M;
      }
    }

    function sectionTitle(title: string) {
      ensureSpace(50);
      const barH = 22;
      doc.save();
      doc.rect(LEFT, y, CW, barH).fill(TABLE_HEADER);
      doc.restore();
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#ffffff");
      doc.text(title, LEFT + 10, y + 6, { width: CW - 20 });
      y += barH + 10;
      doc.font("Helvetica").fontSize(9.5).fillColor(BODY);
    }

    // HEADER
    const LOGO_W = 110;
    const logoPath = slotLogoPath ?? path.join(process.cwd(), "public", "media", "brand", "hero-logo.jpeg");

    const companyLines = [
      { text: "Schnell Sicher Umzug", bold: true, size: 9.5 },
      { text: "Anzengruber Stra\u00DFe 9, 12043 Berlin", bold: false, size: 8 },
      { text: "Tel.: +49 172 9573681", bold: false, size: 8 },
      { text: "kontakt@schnellsicherumzug.de", bold: false, size: 8 },
      { text: "USt-IdNr.: DE454603297", bold: false, size: 8 },
    ];

    if (existsSync(logoPath)) {
      try {
        doc.image(logoPath, LEFT, y, { width: LOGO_W });
      } catch {
        doc.font("Helvetica-Bold").fontSize(15).fillColor(BLUE);
        doc.text("SSU", LEFT, y + 12);
      }
    } else {
      doc.font("Helvetica-Bold").fontSize(13).fillColor(BLUE);
      doc.text("Schnell Sicher Umzug", LEFT, y + 12);
    }

    let cy = y;
    for (const line of companyLines) {
      doc.font(line.bold ? "Helvetica-Bold" : "Helvetica").fontSize(line.size).fillColor(line.bold ? DARK : MUTED);
      doc.text(line.text, LEFT, cy, { width: CW, align: "right" });
      cy += line.bold ? 13 : 11;
    }

    const headerBottom = Math.max(cy, y + LOGO_W) + 10;
    y = headerBottom;

    doc.strokeColor(BLUE).lineWidth(2.5).moveTo(LEFT, y).lineTo(RIGHT, y).stroke();
    y += 22;

    // TITLE + INFO BLOCK
    doc.font("Helvetica-Bold").fontSize(22).fillColor(DARK);
    doc.text("UMZUGSVERTRAG", LEFT, y);

    const infoX = LEFT + Math.floor(CW * 0.55);
    const infoW = CW - Math.floor(CW * 0.55);
    const infoStartY = y;
    const labelW = 80;

    const primaryRef = data.orderNo || data.contractNo || data.contractId;
    const displayDate = data.signedAt ? fmtDate(data.signedAt) : fmtDate(data.contractDate);

    const infoItems: { label: string; value: string; bold?: boolean }[] = [
      { label: "Auftragsnr.", value: primaryRef, bold: true },
      { label: "Datum", value: displayDate },
    ];
    if (data.moveDate) {
      infoItems.push({ label: "Umzugstag", value: fmtDate(data.moveDate) });
    }

    let iy = infoStartY;
    for (const item of infoItems) {
      doc.font("Helvetica").fontSize(8).fillColor(MUTED);
      doc.text(item.label, infoX, iy, { width: labelW });
      doc.font(item.bold ? "Helvetica-Bold" : "Helvetica").fontSize(item.bold ? 9.5 : 9).fillColor(DARK);
      doc.text(item.value, infoX + labelW, iy, { width: infoW - labelW });
      iy += 14;
    }

    if (data.contractNo && data.contractNo !== primaryRef) {
      doc.font("Helvetica").fontSize(7).fillColor(MUTED);
      doc.text(`Ref.: ${data.contractNo}`, infoX, iy + 2, { width: infoW });
    }

    y = Math.max(y + 30, iy + 8);
    y += 10;

    //  PARTIES 
    sectionTitle("Vertragsparteien");

    const colW = Math.floor(CW / 2) - 12;

    doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);
    doc.text("Auftragnehmer", LEFT, y, { width: colW });
    doc.text("Auftraggeber", LEFT + colW + 24, y, { width: colW });
    y += 10;

    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(DARK);
    doc.text("Schnell Sicher Umzug", LEFT, y, { width: colW });
    doc.text(data.customerName, LEFT + colW + 24, y, { width: colW });
    y += 13;

    doc.font("Helvetica").fontSize(9).fillColor(BODY);
    doc.text("Anzengruber Stra\u00DFe 9, 12043 Berlin", LEFT, y, { width: colW });
    if (data.customerAddress) {
      doc.text(data.customerAddress, LEFT + colW + 24, y, { width: colW });
    }
    y += 12;

    doc.text("Tel.: +49 172 9573681", LEFT, y, { width: colW });
    doc.text(`Tel.: ${data.customerPhone}`, LEFT + colW + 24, y, { width: colW });
    y += 12;

    doc.text("kontakt@schnellsicherumzug.de", LEFT, y, { width: colW });
    doc.text(data.customerEmail, LEFT + colW + 24, y, { width: colW });
    y += 20;

    //  § 1 Vertragsgegenstand 
    sectionTitle("\u00A7 1 Vertragsgegenstand");

    if (data.moveFrom && data.moveTo) {
      const moveText =
        `Der Auftragnehmer verpflichtet sich, den Umzug des Auftraggebers von \u201E${data.moveFrom}\u201C nach \u201E${data.moveTo}\u201C durchzuf\u00FChren.`;
      doc.text(moveText, LEFT, y, { width: CW, align: "justify" });
      y += doc.heightOfString(moveText, { width: CW }) + 8;
    }

    if (data.moveDate) {
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(DARK);
      doc.text(`Umzugstermin: ${fmtDate(data.moveDate)}`, LEFT, y);
      doc.font("Helvetica").fontSize(9.5).fillColor(BODY);
      y += 16;
    }

    if (data.floorFrom != null) {
      doc.text(
        `Auszug: ${data.floorFrom}. Etage${data.elevatorFrom ? " (Aufzug)" : " (kein Aufzug)"}`,
        LEFT, y,
      );
      y += 14;
    }
    if (data.floorTo != null) {
      doc.text(
        `Einzug: ${data.floorTo}. Etage${data.elevatorTo ? " (Aufzug)" : " (kein Aufzug)"}`,
        LEFT, y,
      );
      y += 14;
    }
    y += 8;

    //  § 2 Leistungsumfang + § 3 Vergütung (COMBINED TABLE) 
    sectionTitle("\u00A7 2 Leistungsumfang & Verg\u00FCtung");

    doc.text("Der Auftragnehmer erbringt folgende Leistungen:", LEFT, y, { width: CW });
    y += 14;

    const tblX = LEFT;
    const tblW = CW;
    const col1W = Math.floor(tblW * 0.55);
    const col2W = Math.floor(tblW * 0.15);
    const col3W = tblW - col1W - col2W;
    const rowH = 18;
    const headerH = 22;
    const padH = 8;

    ensureSpace(headerH + data.services.length * rowH + 100);

    doc.save();
    doc.rect(tblX, y, tblW, headerH).fill(TABLE_HEADER);
    doc.restore();

    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#ffffff");
    doc.text("Leistung", tblX + padH, y + 6, { width: col1W - padH * 2 });
    doc.text("Menge", tblX + col1W, y + 6, { width: col2W, align: "center" });
    doc.text("Einheit", tblX + col1W + col2W + padH, y + 6, { width: col3W - padH * 2 });
    y += headerH;

    data.services.forEach((s, i) => {
      const isEven = i % 2 === 0;
      if (isEven) {
        doc.save();
        doc.rect(tblX, y, tblW, rowH).fill(ACCENT_LIGHT);
        doc.restore();
      }

      doc.font("Helvetica").fontSize(9).fillColor(DARK);
      doc.text(s.name, tblX + padH, y + 4, { width: col1W - padH * 2 });
      doc.text(s.quantity ? String(s.quantity) : "\u2013", tblX + col1W, y + 4, { width: col2W, align: "center" });
      doc.text(s.unit || "Pauschal", tblX + col1W + col2W + padH, y + 4, { width: col3W - padH * 2 });
      y += rowH;
    });

    doc.strokeColor(BORDER).lineWidth(0.5).moveTo(tblX, y).lineTo(tblX + tblW, y).stroke();
    y += 2;

    const priceBoxH = 76;
    const priceBoxY = y;
    doc.save();
    doc.rect(tblX, priceBoxY, tblW, priceBoxH).fill(LIGHT_BG);
    doc.rect(tblX, priceBoxY, tblW, priceBoxH).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.restore();

    const priceRightX = tblX + tblW - padH;
    const priceLabelX = tblX + Math.floor(tblW * 0.5);
    let py = priceBoxY + 10;

    doc.font("Helvetica").fontSize(9).fillColor(BODY);
    doc.text("Nettobetrag:", priceLabelX, py);
    doc.text(eur(data.netCents), priceLabelX, py, { width: priceRightX - priceLabelX, align: "right" });
    py += 16;

    doc.text("MwSt. (19%):", priceLabelX, py);
    doc.text(eur(data.vatCents), priceLabelX, py, { width: priceRightX - priceLabelX, align: "right" });
    py += 14;

    doc.strokeColor(BORDER).lineWidth(0.5).moveTo(priceLabelX, py).lineTo(priceRightX, py).stroke();
    py += 8;

    doc.font("Helvetica-Bold").fontSize(12).fillColor(DARK);
    doc.text("Gesamt (brutto):", priceLabelX, py);
    doc.text(eur(data.grossCents), priceLabelX, py, { width: priceRightX - priceLabelX, align: "right" });

    y = priceBoxY + priceBoxH + 10;

    doc.font("Helvetica").fontSize(9).fillColor(BODY);
    doc.text(
      "Die Zahlung erfolgt nach vollst\u00E4ndiger Leistungserbringung per \u00DCberweisung oder Barzahlung.",
      LEFT, y, { width: CW, align: "justify" },
    );
    y += 22;

    //  Notes (if present) 
    if (data.notes) {
      ensureSpace(50);
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(BLUE);
      doc.text("Besondere Hinweise:", LEFT, y, { width: CW });
      y += 14;
      doc.font("Helvetica").fontSize(9).fillColor(BODY);
      doc.text(data.notes, LEFT + 8, y, { width: CW - 16, align: "justify" });
      y += doc.heightOfString(data.notes, { width: CW - 16 }) + 12;
    }

    //  § 3 Pflichten 
    sectionTitle("\u00A7 3 Pflichten des Auftraggebers");

    const obligations = [
      "Der Auftraggeber stellt sicher, dass alle Zugangswege frei und begehbar sind.",
      "Parkpl\u00E4tze f\u00FCr das Umzugsfahrzeug werden vom Auftraggeber organisiert.",
      "Wertgegenst\u00E4nde und wichtige Dokumente werden vom Auftraggeber selbst transportiert.",
      "Der Auftraggeber informiert den Auftragnehmer rechtzeitig \u00FCber besondere Umst\u00E4nde.",
    ];
    obligations.forEach((text, i) => {
      ensureSpace(25);
      doc.text(`${i + 1}. ${text}`, LEFT, y, { width: CW, align: "justify" });
      y += doc.heightOfString(`${i + 1}. ${text}`, { width: CW }) + 6;
    });
    y += 8;

    //  § 4 Haftung 
    sectionTitle("\u00A7 4 Haftung");
    const haftung =
      "Der Auftragnehmer haftet f\u00FCr Sch\u00E4den, die durch grobe Fahrl\u00E4ssigkeit oder Vorsatz entstehen. " +
      "Die Haftung ist begrenzt auf die \u00FCbliche Transportversicherung. F\u00FCr Sch\u00E4den an nicht ordnungsgem\u00E4\u00DF " +
      "verpackten Gegenst\u00E4nden wird keine Haftung \u00FCbernommen.";
    doc.text(haftung, LEFT, y, { width: CW, align: "justify" });
    y += doc.heightOfString(haftung, { width: CW }) + 10;

    //  § 5 Stornierung / Rücktritt 
    ensureSpace(18 + 30 + 4 * 16 + 40);
    sectionTitle("\u00A7 5 Stornierung / R\u00FCcktritt");

    const stornoIntro =
      "Der Auftraggeber kann den Vertrag jederzeit vor dem Umzugstermin k\u00FCndigen. " +
      "Bei R\u00FCcktritt werden folgende Stornogeb\u00FChren f\u00E4llig:";
    doc.text(stornoIntro, LEFT, y, { width: CW, align: "justify" });
    y += doc.heightOfString(stornoIntro, { width: CW }) + 10;

    const stornoTiers = [
      ["Bis 7 Tage vor Umzugstermin:", "30 % der Auftragssumme"],
      ["6\u20133 Tage vor Umzugstermin:", "50 % der Auftragssumme"],
      ["2 Tage vor Umzugstermin:", "80 % der Auftragssumme"],
      ["Am Umzugstag (Tag 0):", "100 % der Auftragssumme"],
    ];
    const tierLabelW = Math.floor(CW * 0.55);
    const tierValueW = CW - tierLabelW;

    stornoTiers.forEach(([label, value]) => {
      doc.font("Helvetica").fontSize(9.5).fillColor(BODY);
      doc.text(label, LEFT + 8, y, { width: tierLabelW });
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(DARK);
      doc.text(value, LEFT + tierLabelW, y, { width: tierValueW, align: "right" });
      y += 16;
    });

    y += 6;
    const stornoNote =
      "Dem Kunden bleibt der Nachweis vorbehalten, dass ein geringerer Schaden entstanden ist.";
    doc.font("Helvetica").fontSize(8.5).fillColor(MUTED);
    doc.text(stornoNote, LEFT, y, { width: CW, align: "justify" });
    y += doc.heightOfString(stornoNote, { width: CW }) + 10;

    //  § 6 Schlussbestimmungen 
    ensureSpace(18 + 40);
    sectionTitle("\u00A7 6 Schlussbestimmungen");
    const schluss =
      "Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist Berlin. " +
      "\u00C4?nderungen und Erg\u00E4nzungen dieses Vertrages bed\u00FCrfen der Schriftform.";
    doc.text(schluss, LEFT, y, { width: CW, align: "justify" });
    y += doc.heightOfString(schluss, { width: CW }) + 20;

    //  SIGNATURES 
    ensureSpace(130);

    doc.strokeColor(BLUE).lineWidth(1).moveTo(LEFT, y).lineTo(RIGHT, y).stroke();
    y += 16;

    const sigW = Math.floor((CW - 30) / 2);

    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(BLUE);
    doc.text("Auftragnehmer", LEFT, y, { width: sigW });
    doc.text("Auftraggeber", LEFT + sigW + 30, y, { width: sigW });
    y += 44;

    doc.strokeColor("#94a3b8").lineWidth(0.75);
    doc.moveTo(LEFT, y).lineTo(LEFT + sigW, y).stroke();
    doc.moveTo(LEFT + sigW + 30, y).lineTo(RIGHT, y).stroke();
    const sigLineY = y;
    y += 8;

    const stampPath = slotStampPath && existsSync(slotStampPath)
      ? slotStampPath
      : resolveCompanyStampPath();
    let stampDrawn = false;

    if (stampPath) {
      try {
        doc.image(stampPath, LEFT + 10, sigLineY - 100, {
          fit: [140, 140],
          valign: "center",
        });
        stampDrawn = true;
      } catch { /* text fallback below */ }
    }

    if (!stampDrawn) {
      doc.font("Helvetica-Bold").fontSize(14).fillColor(BLUE);
      doc.text("Schnell Sicher Umzug", LEFT + 10, sigLineY - 22, { width: 180 });
    }

    if (data.customerSignatureDataUrl) {
      try {
        const base64Data = data.customerSignatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
        const sigBuffer = Buffer.from(base64Data, "base64");
        doc.image(sigBuffer, LEFT + sigW + 40, sigLineY - 50, {
          fit: [sigW - 20, 44],
          valign: "center",
        });
      } catch {
        if (data.customerSignedName) {
          doc.font("Helvetica-Oblique").fontSize(12).fillColor(DARK);
          doc.text(data.customerSignedName, LEFT + sigW + 40, sigLineY - 22, { width: sigW - 20 });
        }
      }
    } else if (data.customerSignedName) {
      doc.font("Helvetica-Oblique").fontSize(12).fillColor(DARK);
      doc.text(data.customerSignedName, LEFT + sigW + 40, sigLineY - 22, { width: sigW - 20 });
    }

    const sigDateStr = data.signedAt
      ? `Berlin, ${fmtDate(data.signedAt)}`
      : `Berlin, ${fmtDate(data.contractDate)}`;

    doc.font("Helvetica").fontSize(8).fillColor(DARK);
    doc.text(sigDateStr, LEFT, y, { width: sigW });
    doc.text(sigDateStr, LEFT + sigW + 30, y, { width: sigW });
    y += 11;

    doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);
    doc.text("Schnell Sicher Umzug", LEFT, y, { width: sigW });
    if (data.customerSignedName) {
      doc.text(data.customerSignedName, LEFT + sigW + 30, y, { width: sigW });
    }

    //  AGB PAGE 
    doc.addPage();
    y = M;

    doc.save();
    doc.rect(LEFT, y, CW, 30).fill(TABLE_HEADER);
    doc.restore();
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#ffffff");
    doc.text("Allgemeine Gesch\u00E4ftsbedingungen", LEFT + 10, y + 8, { width: CW - 20, align: "center" });
    y += 44;

    function agbSection(num: number, title: string, paragraphs: string[]) {
      ensureSpace(50);
      doc.font("Helvetica-Bold").fontSize(10).fillColor(BLUE);
      doc.text(`\u00A7 ${num} ${title}`, LEFT, y, { width: CW });
      y += 15;
      doc.font("Helvetica").fontSize(8.5).fillColor(BODY);
      for (const p of paragraphs) {
        ensureSpace(20);
        doc.text(p, LEFT, y, { width: CW, align: "justify", lineGap: 1.5 });
        y += doc.heightOfString(p, { width: CW, lineGap: 1.5 }) + 5;
      }
      y += 6;
    }

    agbSection(1, "Geltungsbereich", [
      "Diese Allgemeinen Gesch\u00E4ftsbedingungen gelten f\u00FCr alle Vertr\u00E4ge zwischen der Firma Schnell Sicher Umzug, " +
        "Inhaber Baschar Al Hasan (nachfolgend \u201EAuftragnehmer\u201C), und dem Auftraggeber \u00FCber die Erbringung von " +
        "Umzugs-, Entsorgungs- und Montagedienstleistungen.",
      "Abweichende Bedingungen des Auftraggebers werden nur anerkannt, wenn der Auftragnehmer ihrer Geltung " +
        "ausdr\u00FCcklich schriftlich zugestimmt hat.",
    ]);

    agbSection(2, "Leistungserbringung", [
      "Der Umfang der zu erbringenden Leistungen ergibt sich aus dem jeweiligen Angebot bzw. Vertrag. " +
        "Der Auftragnehmer ist berechtigt, zur Erf\u00FCllung des Auftrags qualifizierte Subunternehmer einzusetzen.",
      "Termin\u00E4?nderungen aufgrund h\u00F6herer Gewalt, Witterungsbedingungen oder beh\u00F6rdlicher Anordnungen berechtigen " +
        "nicht zur Minderung der vereinbarten Verg\u00FCtung.",
    ]);

    agbSection(3, "Mitwirkungspflichten des Auftraggebers", [
      "Der Auftraggeber stellt sicher, dass s\u00E4mtliche Zugangswege zum Be- und Entladeort frei, sicher und " +
        "begehbar sind. Haltezonen f\u00FCr das Umzugsfahrzeug sind rechtzeitig zu organisieren.",
      "Wertgegenst\u00E4nde, Bargeld, Schmuck, wichtige Dokumente und Datentr\u00E4ger sind vom Auftraggeber selbst " +
        "zu transportieren. Der Auftragnehmer \u00FCbernimmt hierf\u00FCr keine Haftung.",
      "Der Auftraggeber hat den Auftragnehmer rechtzeitig \u00FCber besondere Umst\u00E4nde zu informieren " +
        "(z. B. Zugangseinschr\u00E4nkungen, schwer zug\u00E4ngliche R\u00E4ume, besonders schwere oder empfindliche Gegenst\u00E4nde).",
    ]);

    agbSection(4, "Haftung und Versicherung", [
      "Der Auftragnehmer haftet f\u00FCr Sch\u00E4den an Transportgut, die durch sein Verschulden oder das Verschulden " +
        "seiner Erf\u00FCllungsgehilfen verursacht werden, im Rahmen der gesetzlichen Bestimmungen (\u00A7\u00A7 451 ff. HGB).",
      "Die Haftung ist auf den gemeinen Wert der besch\u00E4digten Gegenst\u00E4nde begrenzt, sofern nicht grobe " +
        "Fahrl\u00E4ssigkeit oder Vorsatz vorliegt. F\u00FCr nicht ordnungsgem\u00E4\u00DF vom Auftraggeber verpackte Gegenst\u00E4nde " +
        "wird keine Haftung \u00FCbernommen.",
      "Sch\u00E4den sind unverz\u00FCglich, sp\u00E4testens jedoch innerhalb von 24 Stunden nach der Leistungserbringung, " +
        "schriftlich beim Auftragnehmer anzuzeigen.",
    ]);

    agbSection(5, "Zahlungsbedingungen", [
      "Die vereinbarte Verg\u00FCtung ist nach vollst\u00E4ndiger Leistungserbringung f\u00E4llig und per " +
        "\u00DCberweisung oder Barzahlung zu begleichen, sofern nichts anderes vereinbart wurde.",
      "Alle Preise verstehen sich netto zuz\u00FCglich der gesetzlichen Umsatzsteuer von derzeit 19 %.",
      "Bei Zahlungsverzug ist der Auftragnehmer berechtigt, Verzugszinsen in H\u00F6he von 5 Prozentpunkten " +
        "\u00FCber dem jeweiligen Basiszinssatz der EZB zu berechnen.",
    ]);

    agbSection(6, "Stornierung und R\u00FCcktritt", [
      "Der Auftraggeber kann den Vertrag jederzeit vor dem Umzugstermin k\u00FCndigen. " +
        "Bei R\u00FCcktritt werden folgende Stornogeb\u00FChren f\u00E4llig:",
      "\u2013 Bis 7 Tage vor Umzugstermin: 30 % der Auftragssumme\n" +
        "\u2013 6\u20133 Tage vor Umzugstermin: 50 % der Auftragssumme\n" +
        "\u2013 2 Tage vor Umzugstermin: 80 % der Auftragssumme\n" +
        "\u2013 Am Umzugstag: 100 % der Auftragssumme",
      "Dem Kunden bleibt der Nachweis vorbehalten, dass ein geringerer Schaden entstanden ist.",
    ]);

    agbSection(7, "Datenschutz", [
      "Der Auftragnehmer erhebt und verarbeitet personenbezogene Daten des Auftraggebers ausschlie\u00DFlich " +
        "zum Zwecke der Vertragsdurchf\u00FChrung und im Einklang mit der Datenschutz-Grundverordnung (DSGVO) " +
        "sowie dem Bundesdatenschutzgesetz (BDSG).",
      "Eine Weitergabe an Dritte erfolgt nur, soweit dies zur Vertragserf\u00FCllung erforderlich ist " +
        "(z. B. an eingesetzte Subunternehmer) oder eine gesetzliche Verpflichtung besteht.",
    ]);

    agbSection(8, "Schlussbestimmungen", [
      "Sollten einzelne Bestimmungen dieses Vertrages oder dieser AGB unwirksam sein oder werden, " +
        "so bleibt die Wirksamkeit der \u00FCbrigen Bestimmungen unber\u00FChrt. An die Stelle der unwirksamen " +
        "Bestimmung tritt eine wirksame Regelung, die dem wirtschaftlichen Zweck am n\u00E4chsten kommt.",
      "Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand f\u00FCr alle Streitigkeiten aus " +
        "oder im Zusammenhang mit diesem Vertrag ist Berlin.",
      "\u00C4?nderungen und Erg\u00E4nzungen dieses Vertrages sowie dieser AGB bed\u00FCrfen der Schriftform. " +
        "M\u00FCndliche Nebenabreden bestehen nicht.",
    ]);

    //  FOOTER (every page) 
    function drawFooter() {
      const fy = H - M - FOOTER_H;
      doc.strokeColor(BORDER).lineWidth(0.5).moveTo(LEFT, fy).lineTo(RIGHT, fy).stroke();

      const fy1 = fy + 8;
      doc.font("Helvetica").fontSize(6.5).fillColor(MUTED);
      doc.text(
        "Schnell Sicher Umzug  \u00B7  Anzengruber Stra\u00DFe 9, 12043 Berlin  \u00B7  Tel.: +49 172 9573681  \u00B7  USt-IdNr.: DE454603297",
        LEFT, fy1, { width: CW, align: "center" },
      );
      doc.text(
        "Bankverbindung: Berliner Sparkasse  \u00B7  Kontoinhaber: Baschar Al Hasan  \u00B7  IBAN: DE75 1005 0000 0191 5325 76  \u00B7  BIC: BELADEBEXXX",
        LEFT, fy1 + 10, { width: CW, align: "center" },
      );
    }

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      drawFooter();
    }

    doc.end();
  });
}




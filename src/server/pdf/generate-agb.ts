import PDFDocument from "pdfkit";
import path from "path";
import { existsSync } from "fs";
import { getImageSlot, publicSrcToAbsolute } from "@/server/content/slots";

const BLUE = "#1e3a8a";
const DARK = "#0f172a";
const BODY = "#334155";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";

const M = 56;
const W = 595;
const H = 842;
const LEFT = M;
const RIGHT = W - M;
const CW = RIGHT - LEFT;
const FOOTER_H = 32;
const SAFE_BOTTOM = H - M - FOOTER_H - 10;

export async function generateAGBPDF(): Promise<Buffer> {
  const logoSlot = await getImageSlot({
    key: "img.pdf.brand.logo",
    fallbackSrc: "/media/brand/hero-logo.jpeg",
  });
  const slotLogoPath = publicSrcToAbsolute(logoSlot.src);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      bufferPages: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      info: {
        Title: "Allgemeine Gesch\u00E4ftsbedingungen \u2013 Schnell Sicher Umzug",
        Author: "Schnell Sicher Umzug",
        Subject: "AGB",
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

    // ━━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const logoPath = slotLogoPath ?? path.join(process.cwd(), "public", "media", "brand", "hero-logo.jpeg");
    if (existsSync(logoPath)) {
      try {
        doc.image(logoPath, LEFT, y, { width: 40, height: 40 });
      } catch { /* fallback below */ }
    }
    doc.font("Helvetica-Bold").fontSize(10).fillColor(BLUE);
    doc.text("Schnell Sicher Umzug", LEFT + 48, y + 12, { width: CW - 48 });
    y += 48;

    doc.strokeColor(BLUE).lineWidth(1).moveTo(LEFT, y).lineTo(RIGHT, y).stroke();
    y += 20;

    // ━━━ TITLE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    doc.font("Helvetica-Bold").fontSize(16).fillColor(DARK);
    doc.text("Allgemeine Gesch\u00E4ftsbedingungen", LEFT, y, { width: CW, align: "center" });
    y += 24;
    doc.strokeColor(BLUE).lineWidth(1).moveTo(LEFT, y).lineTo(RIGHT, y).stroke();
    y += 18;

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

    // ━━━ FOOTER (every page) ━━━━━━━━━━━━━━━━━━━━━━━━━━
    function drawFooter() {
      const fy = H - M - FOOTER_H;
      doc.strokeColor(BORDER).lineWidth(0.5).moveTo(LEFT, fy).lineTo(RIGHT, fy).stroke();

      const fy1 = fy + 8;
      doc.font("Helvetica").fontSize(6.5).fillColor(MUTED);
      doc.text(
        "Schnell Sicher Umzug  \u00B7  Inhaber: Baschar Al Hasan  \u00B7  Anzengruber Stra\u00DFe 9, 12043 Berlin  \u00B7  Tel.: +49 172 9573681  \u00B7  USt-IdNr.: DE454603297",
        LEFT,
        fy1,
        { width: CW, align: "center" },
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

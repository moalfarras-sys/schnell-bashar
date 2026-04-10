import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generateOfferPDF } from "../src/server/pdf/generate-offer";
import { generateQuotePdf } from "../src/server/pdf/generate-quote";
import { generateContractPDF } from "../src/server/pdf/generate-contract";
import { generateInvoicePDF } from "../src/server/pdf/generate-invoice";
import { generateAGBPDF } from "../src/server/pdf/generate-agb";
import { generateQuarterlyReportPdf } from "../src/server/pdf/generate-quarterly-report";

async function main() {
  const outDir = path.join(process.cwd(), "tmp", "pdfs");
  mkdirSync(outDir, { recursive: true });

  const compactAddress = "Weserstraße 42, 12045 Berlin";
  const stressAddress = "Musterstraße 123, Aufgang B, Hinterhaus, 5. Obergeschoss, 12099 Berlin";
  const longService =
    "Demontage und sichere Verpackung einer sehr großen Schrankwand inklusive Glasbauteilen, Spezialschutz, Transportdecken und besonders vorsichtiger Verladung";

  const offerCompact = await generateOfferPDF({
    offerId: "ANG-TEST-2026-0001",
    offerNo: "ANG-20260410-001",
    orderNo: "AUF-20260410-001",
    offerDate: new Date(),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    customerName: "Mia Schneider",
    customerAddress: compactAddress,
    customerPhone: "+49 170 1234567",
    customerEmail: "mia@example.de",
    moveFrom: compactAddress,
    moveTo: "Karl-Marx-Straße 84, 12043 Berlin",
    moveDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    floorFrom: 2,
    floorTo: 1,
    elevatorFrom: false,
    elevatorTo: true,
    speed: "STANDARD",
    serviceType: "UMZUG",
    services: [
      { name: "Umzugspauschale", quantity: 1, unit: "Paket", priceCents: 62000 },
      { name: "Möbelmontage", quantity: 1, unit: "Paket", priceCents: 9000 },
    ],
    netCents: 71000,
    vatCents: 13490,
    grossCents: 84490,
  });

  const offerStress = await generateOfferPDF({
    offerId: "ANG-TEST-2026-0002",
    offerNo: "ANG-20260410-002",
    orderNo: "AUF-20260410-002",
    quoteId: "QUO-20260410-002",
    offerDate: new Date(),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    customerName: "Maximilian Alexander Mustermann GmbH Familienumzug",
    customerAddress: stressAddress,
    customerPhone: "+49 170 1234567",
    customerEmail: "max.mustermann@example.de",
    moveFrom: stressAddress,
    moveTo: "Hauptstraße 77, 4. OG ohne Aufzug, 10115 Berlin",
    moveDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    moveTime: "08:00 - 12:00",
    floorFrom: 5,
    floorTo: 4,
    elevatorFrom: false,
    elevatorTo: false,
    notes:
      "Bitte den Transportweg über den Innenhof nutzen. Empfindliche Geräte sind gesondert markiert, stoßfrei zu transportieren und nur durch den Teamleiter freizugeben.",
    volumeM3: 48,
    speed: "STANDARD",
    serviceType: "KOMBI",
    needNoParkingZone: true,
    addons: ["Halteverbotszone", "Möbelmontage", "Verpackungsservice", "Einlagerung", "Entsorgung"],
    checklist: [
      "Möbel vorab entleeren",
      "Zugang zum Keller sicherstellen",
      "Aufzug reservieren",
      "Hausverwaltung informieren",
    ],
    services: [
      { name: longService, quantity: 1, unit: "Paket", priceCents: 42000 },
      { name: "Transportservice inkl. Tragehilfe und Equipment", quantity: 1, unit: "Paket", priceCents: 68000 },
      { name: "Entsorgung von Sperrmüll gemäß Berliner Entsorgungsrichtlinien", quantity: 1, unit: "Paket", priceCents: 22000 },
    ],
    netCents: 132000,
    vatCents: 25080,
    grossCents: 157080,
  });

  const quoteStress = await generateQuotePdf({
    publicId: "QUO-20260410-001",
    customerName: "Maximilian Mustermann",
    customerEmail: "max.mustermann@example.de",
    serviceType: "COMBO",
    speed: "STANDARD",
    slotLabel: "Dienstag, 14.04.2026, 08:00-12:00",
    lines: [
      { label: longService, qty: 1, unit: 42000, total: 42000 },
      { label: "Umzugstransport inkl. Möbelschutz und Tragehilfe", qty: 1, unit: 68000, total: 68000 },
    ],
    netCents: 110000,
    vatCents: 20900,
    grossCents: 130900,
  });

  const contractStress = await generateContractPDF({
    contractId: "CON-20260410-001",
    contractNo: "VER-20260410-001",
    offerNo: "ANG-20260410-002",
    orderNo: "AUF-20260410-002",
    contractDate: new Date(),
    customerName: "Maximilian Mustermann",
    customerAddress: stressAddress,
    customerPhone: "+49 170 1234567",
    customerEmail: "max.mustermann@example.de",
    moveFrom: stressAddress,
    moveTo: "Hauptstraße 77, 4. OG ohne Aufzug, 10115 Berlin",
    moveDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    floorFrom: 5,
    floorTo: 4,
    elevatorFrom: false,
    elevatorTo: false,
    notes:
      "Besonderer Hinweis: Zerbrechliche Gegenstände separat kennzeichnen. Parken im Innenhof ist nur mit Halteverbotszone zulässig.",
    services: [
      { name: longService, quantity: 1, unit: "Paket" },
      { name: "Transportservice inkl. Tragehilfe und Equipment", quantity: 1, unit: "Paket" },
      { name: "Entsorgung von Sperrmüll gemäß Berliner Entsorgungsrichtlinien", quantity: 1, unit: "Paket" },
    ],
    netCents: 110000,
    vatCents: 20900,
    grossCents: 130900,
    customerSignedName: "Max Mustermann",
  });

  const invoiceCompact = await generateInvoicePDF({
    invoiceId: "INV-20260410-001",
    invoiceNo: "RE-20260410-101",
    issuedAt: new Date(),
    dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    customerName: "Mia Schneider",
    customerEmail: "mia@example.de",
    customerPhone: "+49 170 998877",
    address: compactAddress,
    description: "Rechnung für Umzugsservice gemäß Auftrag.",
    lineItems: [{ name: "Umzugspauschale", quantity: 1, unit: "Paket", priceCents: 62000 }],
    netCents: 62000,
    vatCents: 11780,
    grossCents: 73780,
    paidCents: 0,
    orderNo: "AUF-20260410-001",
  });

  const invoiceStress = await generateInvoicePDF({
    invoiceId: "INV-20260410-002",
    invoiceNo: "RE-20260410-102",
    issuedAt: new Date(),
    dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    customerName: "Maximilian Mustermann",
    customerEmail: "max.mustermann@example.de",
    customerPhone: "+49 170 1234567",
    address: stressAddress,
    description:
      "Rechnung für Umzug + Entsorgung inklusive Zusatzleistungen gemäß Angebot und bestätigtem Vertrag. Leistungen wurden vollständig durchgeführt.",
    lineItems: [
      { name: longService, quantity: 1, unit: "Paket", priceCents: 42000 },
      { name: "Transportservice inkl. Tragehilfe und Equipment", quantity: 1, unit: "Paket", priceCents: 68000 },
      { name: "Entsorgung von Sperrmüll gemäß Berliner Entsorgungsrichtlinien", quantity: 1, unit: "Paket", priceCents: 22000 },
      { name: "Verpackungsmaterial und Schutzfolien", quantity: 1, unit: "Paket", priceCents: 9000 },
    ],
    netCents: 141000,
    vatCents: 26790,
    grossCents: 167790,
    paidCents: 50000,
    contractNo: "VER-20260410-001",
    offerNo: "ANG-20260410-002",
    orderNo: "AUF-20260410-002",
  });

  const agb = await generateAGBPDF();

  const quarterly = await generateQuarterlyReportPdf({
    year: 2026,
    quarter: 2,
    periodStart: new Date("2026-04-01"),
    periodEnd: new Date("2026-06-30"),
    revenue: { netCents: 1425000, vatCents: 270750, grossCents: 1695750, paidCents: 1580000 },
    expenses: { netCents: 438000, vatCents: 83220, grossCents: 521220 },
    ust: { outputVatCents: 270750, inputVatCents: 83220, vatPayableCents: 187530 },
    profitBeforeTaxCents: 987000,
    byCategory: [
      { categoryName: "Treibstoff", count: 22, netCents: 92000, vatCents: 17480, grossCents: 109480 },
      { categoryName: "Miete und Lager", count: 6, netCents: 135000, vatCents: 25650, grossCents: 160650 },
      { categoryName: "Material und Verpackung", count: 18, netCents: 84000, vatCents: 15960, grossCents: 99960 },
    ],
    warnings: ["Drei Eingangsbelege ohne finalen Zahlungsabgleich.", "Quartalsbericht dient nur der internen Orientierung."],
    dataSourceNote: "Auswertung auf Basis der erfassten Rechnungen, Ausgaben und USt-Daten im System.",
  });

  const outputs = [
    ["offer-compact.pdf", offerCompact],
    ["offer-stress.pdf", offerStress],
    ["quote-stress.pdf", quoteStress],
    ["contract-stress.pdf", contractStress],
    ["invoice-compact.pdf", invoiceCompact],
    ["invoice-stress.pdf", invoiceStress],
    ["agb.pdf", agb],
    ["quarterly-report.pdf", quarterly],
  ] as const;

  for (const [fileName, buffer] of outputs) {
    writeFileSync(path.join(outDir, fileName), buffer);
  }

  console.log(`PDF samples exported to ${outDir}`);
}

main().catch((err) => {
  console.error("Failed to export PDF samples", err);
  process.exit(1);
});

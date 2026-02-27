import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generateOfferPDF } from "../src/server/pdf/generate-offer";
import { generateQuotePdf } from "../src/server/pdf/generate-quote";
import { generateContractPDF } from "../src/server/pdf/generate-contract";
import { generateInvoicePDF } from "../src/server/pdf/generate-invoice";

async function main() {
  const outDir = path.join(process.cwd(), "tmp", "pdfs");
  mkdirSync(outDir, { recursive: true });

  const longService =
    "Demontage und sichere Verpackung einer sehr großen Schrankwand inklusive Glasbauteilen mit Spezialschutz";
  const longAddress =
    "Musterstraße 123, Aufgang B, Hinterhaus, 5. Obergeschoss, 12099 Berlin";

  const offer = await generateOfferPDF({
    offerId: "ANG-TEST-2026-0001",
    offerNo: "ANG-2026-0001",
    orderNo: "AUF-2026-0001",
    offerDate: new Date(),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    customerName: "Maximilian Mustermann",
    customerAddress: longAddress,
    customerPhone: "+49 170 1234567",
    customerEmail: "max.mustermann@example.de",
    moveFrom: longAddress,
    moveTo: "Hauptstraße 77, 4. OG ohne Aufzug, 10115 Berlin",
    moveDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    floorFrom: 5,
    floorTo: 4,
    elevatorFrom: false,
    elevatorTo: false,
    notes:
      "Bitte den Transportweg über den Innenhof nutzen. Empfindliche Geräte sind gesondert markiert und sollen stoßfrei transportiert werden.",
    volumeM3: 48,
    speed: "STANDARD",
    serviceType: "KOMBI",
    needNoParkingZone: true,
    addons: ["Halteverbotszone", "Möbelmontage", "Verpackungsservice"],
    checklist: [
      "Möbel vorab entleeren",
      "Zugang zum Keller sicherstellen",
      "Aufzug reservieren (falls verfügbar)",
    ],
    services: [
      { name: longService, quantity: 1, unit: "Paket", priceCents: 42000 },
      { name: "Transportservice inkl. Tragehilfe und Equipment", quantity: 1, unit: "Paket", priceCents: 68000 },
      { name: "Entsorgung von Sperrmüll gemäß Berliner Entsorgungsrichtlinien", quantity: 1, unit: "Paket", priceCents: 22000 },
    ],
    netCents: 110000,
    vatCents: 20900,
    grossCents: 130900,
  });

  const quote = await generateQuotePdf({
    publicId: "QUO-2026-0001",
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

  const contract = await generateContractPDF({
    contractId: "CON-2026-0001",
    contractNo: "V-2026-0001",
    offerNo: "ANG-2026-0001",
    orderNo: "AUF-2026-0001",
    contractDate: new Date(),
    customerName: "Maximilian Mustermann",
    customerAddress: longAddress,
    customerPhone: "+49 170 1234567",
    customerEmail: "max.mustermann@example.de",
    moveFrom: longAddress,
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

  const invoice = await generateInvoicePDF({
    invoiceId: "INV-2026-0001",
    invoiceNo: "R-2026-0001",
    issuedAt: new Date(),
    dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    customerName: "Maximilian Mustermann",
    customerEmail: "max.mustermann@example.de",
    customerPhone: "+49 170 1234567",
    address: longAddress,
    description:
      "Rechnung für Umzug + Entsorgung inklusive Zusatzleistungen gemäß Angebot und bestätigtem Vertrag.",
    lineItems: [
      { name: longService, quantity: 1, unit: "Paket", priceCents: 42000 },
      { name: "Transportservice inkl. Tragehilfe und Equipment", quantity: 1, unit: "Paket", priceCents: 68000 },
      { name: "Entsorgung von Sperrmüll gemäß Berliner Entsorgungsrichtlinien", quantity: 1, unit: "Paket", priceCents: 22000 },
    ],
    netCents: 110000,
    vatCents: 20900,
    grossCents: 130900,
    paidCents: 0,
    contractNo: "V-2026-0001",
    offerNo: "ANG-2026-0001",
    orderNo: "AUF-2026-0001",
  });

  writeFileSync(path.join(outDir, "offer-sample.pdf"), offer);
  writeFileSync(path.join(outDir, "quote-sample.pdf"), quote);
  writeFileSync(path.join(outDir, "contract-sample.pdf"), contract);
  writeFileSync(path.join(outDir, "invoice-sample.pdf"), invoice);

  console.log(`PDF samples exported to ${outDir}`);
}

main().catch((err) => {
  console.error("Failed to export PDF samples", err);
  process.exit(1);
});

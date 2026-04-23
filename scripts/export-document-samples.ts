import { mkdir } from "node:fs/promises";
import path from "node:path";

import { calculateLineItem } from "../src/lib/documents/calculations";
import { renderDocumentPdf, savePdfSample } from "../src/lib/documents/renderer";
import type { DocumentVersionSnapshot } from "../src/lib/documents/types";

function buildSnapshot(typeLabel: string, grossCents: number): DocumentVersionSnapshot {
  const net = Math.round(grossCents / 1.19);
  const tax = grossCents - net;
  return {
    type: "ANGEBOT",
    status: "DRAFT",
    customerData: {
      name: "Max Mustermann",
      email: "max.mustermann@example.de",
      phone: "+49 172 0000000",
      billingAddress: "Beispielstraße 12, 12043 Berlin",
    },
    serviceData: {
      serviceType: typeLabel,
      serviceDate: new Date().toISOString(),
    },
    addressData: {
      fromAddress: "Beispielstraße 12, 12043 Berlin",
      toAddress: "Zielstraße 45, 10115 Berlin",
    },
    subtotalCents: net,
    taxCents: tax,
    grossCents,
    includeAgbAppendix: false,
    lineItems: [
      calculateLineItem({
        position: 1,
        title: typeLabel,
        description: "Beispielposition für die PDF-Vorschau",
        quantity: 1,
        unit: "Pauschale",
        unitPriceNetCents: net,
        vatRate: 19,
      }),
    ],
  };
}

async function main() {
  const outDir = path.join(process.cwd(), "docs", "sample-documents");
  await mkdir(outDir, { recursive: true });

  const samples = [
    {
      filename: "angebot-sample.pdf",
      type: "ANGEBOT" as const,
      number: "ANG-2026-0001",
      snapshot: buildSnapshot("Umzug 2-Zimmer-Wohnung", 149000),
      includeAgbAppendix: false,
    },
    {
      filename: "rechnung-sample.pdf",
      type: "RECHNUNG" as const,
      number: "RE-2026-0001",
      snapshot: buildSnapshot("Rechnung Umzug Berlin", 149000),
      includeAgbAppendix: false,
    },
    {
      filename: "auftrag-vertrag-sample.pdf",
      type: "AUFTRAG_VERTRAG" as const,
      number: "AUF-2026-0001",
      snapshot: buildSnapshot("Auftrag Umzug Berlin", 149000),
      includeAgbAppendix: false,
    },
    {
      filename: "mahnung-sample.pdf",
      type: "MAHNUNG" as const,
      number: "MAH-2026-0001",
      snapshot: buildSnapshot("Mahnung Rechnung", 149000),
      includeAgbAppendix: false,
    },
    {
      filename: "angebot-mit-agb-sample.pdf",
      type: "ANGEBOT" as const,
      number: "ANG-2026-0002",
      snapshot: buildSnapshot("Angebot mit Zusatzseite", 189000),
      includeAgbAppendix: true,
    },
  ];

  for (const sample of samples) {
    const pdf = await renderDocumentPdf(sample);
    await savePdfSample(path.join(outDir, sample.filename), pdf);
    console.log(`created ${sample.filename}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

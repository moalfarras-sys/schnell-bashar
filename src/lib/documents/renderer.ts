import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PDFDocument } from "pdf-lib";

import type { DocumentVersionSnapshot } from "@/lib/documents/types";
import { generateContractPDF } from "@/server/pdf/generate-contract";
import { generateInvoicePDF } from "@/server/pdf/generate-invoice";
import { generateOfferPDF } from "@/server/pdf/generate-offer";

function mapSnapshotToData(number: string, snapshot: DocumentVersionSnapshot) {
  const lineItems = snapshot.lineItems.map((item) => ({
    name: item.title,
    detailLines: item.description ? [item.description] : undefined,
    quantity: item.quantity,
    unit: item.unit,
    priceCents: item.totalNetCents,
  }));

  const common = {
    customerName: snapshot.customerData.name,
    customerEmail: snapshot.customerData.email || "",
    customerPhone: snapshot.customerData.phone || "",
    address: snapshot.customerData.billingAddress || undefined,
    customerAddress: snapshot.customerData.billingAddress || undefined,
    netCents: snapshot.subtotalCents || 0,
    vatCents: snapshot.taxCents || 0,
    grossCents: snapshot.grossCents || 0,
    paidCents: 0,
    notes: snapshot.visibleNotes || undefined,
  };

  return { common, lineItems };
}

export async function renderDocumentPdf(input: {
  type: "ANGEBOT" | "RECHNUNG" | "AUFTRAG_VERTRAG" | "MAHNUNG" | "AGB_APPENDIX";
  number: string;
  snapshot: DocumentVersionSnapshot;
  includeAgbAppendix?: boolean;
}): Promise<Buffer> {
  const { common, lineItems } = mapSnapshotToData(input.number, input.snapshot);

  let mainPdfBuffer: Buffer;

  if (input.type === "ANGEBOT") {
    mainPdfBuffer = await generateOfferPDF({
      ...common,
      offerId: "draft",
      offerNo: input.number,
      offerDate: input.snapshot.serviceData?.serviceDate
        ? new Date(input.snapshot.serviceData.serviceDate)
        : new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      moveFrom: input.snapshot.addressData?.fromAddress || undefined,
      moveTo: input.snapshot.addressData?.toAddress || undefined,
      moveDate: input.snapshot.serviceData?.serviceDate
        ? new Date(input.snapshot.serviceData.serviceDate)
        : undefined,
      services: lineItems,
    });
  } else if (input.type === "AUFTRAG_VERTRAG") {
    mainPdfBuffer = await generateContractPDF({
      ...common,
      contractId: "draft",
      contractNo: input.number,
      contractDate: input.snapshot.serviceData?.serviceDate
        ? new Date(input.snapshot.serviceData.serviceDate)
        : new Date(),
      moveFrom: input.snapshot.addressData?.fromAddress || undefined,
      moveTo: input.snapshot.addressData?.toAddress || undefined,
      moveDate: input.snapshot.serviceData?.serviceDate
        ? new Date(input.snapshot.serviceData.serviceDate)
        : undefined,
      services: lineItems,
    });
  } else if (input.type === "RECHNUNG" || input.type === "MAHNUNG") {
    // Treat Mahnung as an Invoice for now as it's the closest format
    mainPdfBuffer = await generateInvoicePDF({
      ...common,
      invoiceId: "draft",
      invoiceNo: input.number,
      issuedAt: new Date(),
      dueAt: input.snapshot.dueAt
        ? new Date(input.snapshot.dueAt)
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      lineItems: lineItems,
    });
  } else {
    // Fallback for AGB_APPENDIX or others (just render an empty offer)
    mainPdfBuffer = await generateOfferPDF({
      ...common,
      offerId: "draft",
      offerNo: input.number,
      offerDate: new Date(),
      validUntil: new Date(),
      services: lineItems,
    });
  }

  // If we don't need to include AGB appendix, just return the generated PDF buffer directly.
  // Note: Pdfkit AGB rendering is not available here, so we skip AGB for now to ensure a unified format.
  // We can add AGB by fetching a static AGB.pdf from public/ if needed.
  return mainPdfBuffer;
}

export async function savePdfSample(outputPath: string, buffer: Buffer) {
  const absolute = resolve(outputPath);
  await writeFile(absolute, buffer);
  return absolute;
}

/**
 * One-off script to generate an offer PDF and save to disk.
 * Usage: npx tsx scripts/export-offer-pdf.ts
 */
import { prisma } from "../src/server/db/prisma";
import { generateOfferPDF } from "../src/server/pdf/generate-offer";
import { writeFileSync } from "fs";
import path from "path";

async function main() {
  const offer = await prisma.offer.findFirst({
    orderBy: { createdAt: "desc" },
    include: { order: true },
  });
  if (!offer) {
    console.error("No offer found");
    process.exit(1);
  }

  const wizardData = (offer.order?.wizardData as any) || {};
  const inquiry = wizardData?.inquiry || {};

  const pdfBuffer = await generateOfferPDF({
    offerId: offer.id,
    offerDate: offer.createdAt,
    validUntil: offer.validUntil,
    customerName: offer.customerName,
    customerAddress: offer.customerAddress ?? undefined,
    customerPhone: offer.customerPhone ?? "",
    customerEmail: offer.customerEmail ?? "",
    moveFrom: offer.moveFrom ?? undefined,
    moveTo: offer.moveTo ?? undefined,
    moveDate: offer.moveDate ?? undefined,
    floorFrom: offer.floorFrom ?? undefined,
    floorTo: offer.floorTo ?? undefined,
    elevatorFrom: offer.elevatorFrom ?? undefined,
    elevatorTo: offer.elevatorTo ?? undefined,
    notes: offer.notes ?? undefined,
    volumeM3: offer.order?.volumeM3 || inquiry?.volumeM3,
    speed: offer.order?.speed || inquiry?.speed,
    serviceType: inquiry?.serviceType,
    needNoParkingZone: inquiry?.needNoParkingZone,
    addons: inquiry?.addons,
    services: (offer.services as any[]) || [],
    netCents: offer.netCents,
    vatCents: offer.vatCents,
    grossCents: offer.grossCents,
  });

  const outPath = path.join(process.cwd(), "offer-preview.pdf");
  writeFileSync(outPath, pdfBuffer);
  console.log("Saved:", outPath);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

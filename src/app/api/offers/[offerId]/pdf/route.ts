import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { generateOfferPDF } from "@/server/pdf/generate-offer";
import { offerDisplayNo, orderDisplayNo } from "@/server/ids/document-number";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ offerId: string }> },
) {
  const { offerId } = await params;

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { order: true },
  });

  if (!offer) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }

  const wizardData = (offer.order?.wizardData as any) || {};
  const inquiry = wizardData?.inquiry || {};
  const orderNo = offer.order ? orderDisplayNo(offer.order) : offer.id;
  const displayOfferNo = offerDisplayNo({
    offerNo: offer.offerNo,
    id: offer.id,
    orderNo: offer.order?.orderNo ?? null,
    orderPublicId: offer.order?.publicId ?? null,
  });

  try {
    const pdfBuffer = await generateOfferPDF({
      offerId: offer.id,
      offerNo: displayOfferNo,
      orderNo,
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
      volumeM3: offer.order?.volumeM3 || inquiry.volumeM3,
      speed: offer.order?.speed || inquiry.speed,
      serviceType: inquiry.serviceType,
      needNoParkingZone: inquiry.needNoParkingZone,
      addons: inquiry.addons,
      services: offer.services as any[],
      netCents: offer.netCents,
      vatCents: offer.vatCents,
      grossCents: offer.grossCents,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Angebot-${displayOfferNo}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[offers/pdf] PDF generation failed:", err);
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 },
    );
  }
}

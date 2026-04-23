import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ offerId: string }> },
) {
  try {
    const { offerId } = await context.params;
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { order: true, contract: true },
    });

    if (!offer) {
      return NextResponse.json({ error: "Angebot nicht gefunden" }, { status: 404 });
    }

    const now = new Date();
    if (now > offer.expiresAt) {
      return NextResponse.json({ error: "Angebot abgelaufen" }, { status: 400 });
    }

    if (offer.status !== "ACCEPTED") {
      await prisma.$transaction(async (tx) => {
        await tx.offer.update({
          where: { id: offer.id },
          data: {
            status: "ACCEPTED",
            acceptedAt: now,
          },
        });

        if (offer.orderId) {
          await tx.order.update({
            where: { id: offer.orderId },
            data: {
              workflowStatus: "OFFER_ACCEPTED",
            },
          });
        }

        if (offer.orderId) {
          await tx.quote.updateMany({
            where: { orderId: offer.orderId },
            data: {
              status: "CONFIRMED",
            },
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      offerAccepted: true,
      contractCreated: false,
      signingEnabled: false,
      message:
        "Vielen Dank. Ihr Angebot wurde bestätigt. Unser Team prüft nun die Angaben. Eine Vertragsfreigabe oder Unterschrift erfolgt erst nach interner Prüfung.",
      legacyContractExists: Boolean(offer.contract),
    });
  } catch (error) {
    console.error("[offers/accept] Error:", error);
    return NextResponse.json({ error: "Fehler beim Verarbeiten des Angebots" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { STORAGE_BUCKETS, getSupabaseAdmin } from "@/lib/supabase";
import { prisma } from "@/server/db/prisma";
import { sendSigningEmail } from "@/server/email/send-signing-email";
import { generateContractPDF } from "@/server/pdf/generate-contract";
import {
  buildFallbackSigningUrl,
  getFallbackSigningExpiry,
  issueFallbackSigningToken,
} from "@/server/signing/fallback-signing";
import {
  deriveContractNoFromOrderNo,
  deriveOfferNoFromOrderNo,
  orderDisplayNo,
} from "@/server/ids/document-number";

function ensureInternalSigning(offerToken: string, now: Date) {
  const tokenPayload = issueFallbackSigningToken();
  const signingUrl = buildFallbackSigningUrl(tokenPayload.token, offerToken);
  const tokenExpiresAt = getFallbackSigningExpiry(now);

  return {
    signingUrl,
    signatureTokenHash: tokenPayload.tokenHash,
    signatureTokenExpiresAt: tokenExpiresAt,
  };
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ offerId: string }> },
) {
  try {
    const { offerId } = await context.params;

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { order: true },
    });

    if (!offer) {
      return NextResponse.json({ error: "Angebot nicht gefunden" }, { status: 404 });
    }

    const now = new Date();
    if (now > offer.expiresAt) {
      return NextResponse.json({ error: "Angebot abgelaufen" }, { status: 400 });
    }

    const orderNo = offer.order ? orderDisplayNo(offer.order) : offer.id;
    const offerNo = offer.offerNo || deriveOfferNoFromOrderNo(orderNo);
    const contractNo = deriveContractNoFromOrderNo(orderNo);

    if (offer.status === "ACCEPTED") {
      const existingContract = await prisma.contract.findUnique({ where: { offerId } });
      if (!existingContract) {
        return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });
      }

      const tokenExpired =
        !existingContract.signatureTokenExpiresAt ||
        existingContract.signatureTokenExpiresAt < now;
      const needsRefresh =
        !existingContract.signingUrl ||
        !existingContract.signatureTokenHash ||
        tokenExpired ||
        existingContract.signatureProvider !== "INTERNAL";

      if (!needsRefresh) {
        return NextResponse.json({
          success: true,
          alreadyAccepted: true,
          signingUrl: existingContract.signingUrl,
          provider: "INTERNAL",
        });
      }

      const refreshed = ensureInternalSigning(offer.token, now);
      const updated = await prisma.contract.update({
        where: { id: existingContract.id },
        data: {
          signatureProvider: "INTERNAL",
          docusignEnvelopeId: null,
          docusignStatus: "internal_pending",
          signingUrl: refreshed.signingUrl,
          signatureTokenHash: refreshed.signatureTokenHash,
          signatureTokenExpiresAt: refreshed.signatureTokenExpiresAt,
          sentForSigningAt: existingContract.sentForSigningAt ?? now,
        },
      });

      const emailResult = await sendSigningEmail({
        customerName: offer.customerName,
        customerEmail: offer.customerEmail,
        signingLink: refreshed.signingUrl,
        provider: "INTERNAL",
        contractPdfUrl: updated.contractPdfUrl,
      });

      return NextResponse.json({
        success: true,
        alreadyAccepted: true,
        signingUrl: refreshed.signingUrl,
        provider: "INTERNAL",
        warning: emailResult.success
          ? undefined
          : "Signatur-Link wurde erstellt, aber die E-Mail konnte nicht zugestellt werden.",
      });
    }

    await prisma.offer.update({
      where: { id: offerId },
      data: { status: "ACCEPTED", acceptedAt: now },
    });

    const services = offer.services as any[];

    const contractPdfBuffer = await generateContractPDF({
      contractId: contractNo,
      contractNo,
      offerNo,
      orderNo,
      contractDate: now,
      customerName: offer.customerName,
      customerAddress: offer.customerAddress || undefined,
      customerPhone: offer.customerPhone,
      customerEmail: offer.customerEmail,
      moveFrom: offer.moveFrom || undefined,
      moveTo: offer.moveTo || undefined,
      moveDate: offer.moveDate || undefined,
      floorFrom: offer.floorFrom || undefined,
      floorTo: offer.floorTo || undefined,
      elevatorFrom: offer.elevatorFrom,
      elevatorTo: offer.elevatorTo,
      notes: offer.notes || undefined,
      services,
      netCents: offer.netCents,
      vatCents: offer.vatCents,
      grossCents: offer.grossCents,
    });

    let contractPdfUrl: string | null = null;
    try {
      const admin = getSupabaseAdmin();
      const contractFileName = `contract-${contractNo}-${Date.now()}.pdf`;
      const { error: uploadError } = await admin.storage
        .from(STORAGE_BUCKETS.OFFERS)
        .upload(contractFileName, contractPdfBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (!uploadError) {
        const { data: urlData } = admin.storage.from(STORAGE_BUCKETS.OFFERS).getPublicUrl(contractFileName);
        contractPdfUrl = urlData.publicUrl;
      } else {
        console.warn("[accept] Supabase upload failed:", uploadError.message);
      }
    } catch (err) {
      console.warn("[accept] Supabase storage unavailable:", err instanceof Error ? err.message : err);
    }

    const signing = ensureInternalSigning(offer.token, now);

    const contract = await prisma.contract.create({
      data: {
        offerId: offer.id,
        contractNo,
        status: "PENDING_SIGNATURE",
        signatureProvider: "INTERNAL",
        docusignEnvelopeId: null,
        docusignStatus: "internal_pending",
        contractPdfUrl,
        signingUrl: signing.signingUrl,
        signatureTokenHash: signing.signatureTokenHash,
        signatureTokenExpiresAt: signing.signatureTokenExpiresAt,
        sentForSigningAt: now,
      },
    });

    const emailResult = await sendSigningEmail({
      customerName: offer.customerName,
      customerEmail: offer.customerEmail,
      signingLink: signing.signingUrl,
      provider: "INTERNAL",
      contractPdfUrl,
    });

    return NextResponse.json({
      success: true,
      contractId: contract.id,
      signingUrl: signing.signingUrl,
      provider: "INTERNAL",
      warning: emailResult.success
        ? undefined
        : "Vertrag wurde erstellt, aber der Signatur-Link konnte nicht per E-Mail zugestellt werden.",
    });
  } catch (error) {
    console.error("[accept] Error:", error);
    return NextResponse.json(
      { error: "Fehler beim Verarbeiten des Angebots" },
      { status: 500 },
    );
  }
}

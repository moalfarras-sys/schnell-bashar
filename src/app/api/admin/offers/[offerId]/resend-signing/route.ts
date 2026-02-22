import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminToken, adminCookieName } from "@/server/auth/admin-session";
import { isDocuSignReady, resendDocuSignEnvelope } from "@/lib/docusign";
import { prisma } from "@/server/db/prisma";
import { sendSigningEmail } from "@/server/email/send-signing-email";
import {
  buildFallbackSigningUrl,
  getFallbackSigningExpiry,
  issueFallbackSigningToken,
} from "@/server/signing/fallback-signing";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ offerId: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;

  if (!token) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    await verifyAdminToken(token);
  } catch {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { offerId } = await params;

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { contract: true },
  });

  if (!offer) {
    return NextResponse.json({ error: "Angebot nicht gefunden" }, { status: 404 });
  }

  if (!offer.contract) {
    return NextResponse.json({ error: "Kein Vertrag vorhanden" }, { status: 400 });
  }

  if (offer.contract.status !== "PENDING_SIGNATURE") {
    return NextResponse.json(
      { error: "Vertrag ist nicht im Status 'Wartet auf Unterschrift'" },
      { status: 400 },
    );
  }

  let signingUrl = offer.contract.signingUrl;
  let provider = offer.contract.signatureProvider;
  let fallbackActivated = false;
  const now = new Date();

  if (
    provider === "DOCUSIGN" &&
    offer.contract.docusignEnvelopeId &&
    isDocuSignReady()
  ) {
    try {
      await resendDocuSignEnvelope(offer.contract.docusignEnvelopeId);
      await prisma.contract.update({
        where: { id: offer.contract.id },
        data: {
          docusignStatus: "sent",
          sentForSigningAt: now,
        },
      });

      const docusignEmail = await sendSigningEmail({
        customerName: offer.customerName,
        customerEmail: offer.customerEmail,
        provider: "DOCUSIGN",
        contractPdfUrl: offer.contract.contractPdfUrl,
      });

      if (!docusignEmail.success) {
        return NextResponse.json(
          {
            error: docusignEmail.error || "Hinweis-E-Mail konnte nicht gesendet werden",
            provider: "DOCUSIGN",
            fallbackActivated: false,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        provider: "DOCUSIGN",
        fallbackActivated: false,
        message: "DocuSign-Erinnerung wurde erneut ausgelöst.",
      });
    } catch (error) {
      console.warn(
        "[resend-signing] DocuSign resend failed, switching to INTERNAL fallback:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const internalTokenExpired =
    !offer.contract.signatureTokenExpiresAt ||
    offer.contract.signatureTokenExpiresAt < now;
  const needsInternalRefresh =
    provider === "INTERNAL" &&
    (!offer.contract.signingUrl || !offer.contract.signatureTokenHash || internalTokenExpired);

  if (!signingUrl || needsInternalRefresh) {
    const tokenPayload = issueFallbackSigningToken();
    signingUrl = buildFallbackSigningUrl(tokenPayload.token, offer.token);
    fallbackActivated = true;
    provider = "INTERNAL";

    await prisma.contract.update({
      where: { id: offer.contract.id },
      data: {
        signatureProvider: "INTERNAL",
        docusignStatus: "internal_pending",
        signingUrl,
        signatureTokenHash: tokenPayload.tokenHash,
        signatureTokenExpiresAt: getFallbackSigningExpiry(now),
        sentForSigningAt: offer.contract.sentForSigningAt ?? now,
      },
    });
  }

  if (!signingUrl) {
    return NextResponse.json(
      { error: "Keine Signatur-URL vorhanden" },
      { status: 400 },
    );
  }

  const result = await sendSigningEmail({
    customerName: offer.customerName,
    customerEmail: offer.customerEmail,
    signingLink: signingUrl!,
    provider,
    contractPdfUrl: offer.contract.contractPdfUrl,
  });

  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error || "E-Mail konnte nicht gesendet werden",
        provider,
        fallbackActivated,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    provider,
    fallbackActivated,
    message: fallbackActivated
      ? "Signatur-Link erneut gesendet (internes Fallback aktiviert)."
      : "Signatur-Link erneut gesendet.",
  });
}

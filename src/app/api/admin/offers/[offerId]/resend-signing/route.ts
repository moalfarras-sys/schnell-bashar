import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { verifyAdminToken, adminCookieName } from "@/server/auth/admin-session";
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
      { error: "Vertrag ist nicht im Status 'Wartet auf Unterschrift'." },
      { status: 400 },
    );
  }

  let signingUrl = offer.contract.signingUrl;
  const now = new Date();
  const tokenExpired =
    !offer.contract.signatureTokenExpiresAt ||
    offer.contract.signatureTokenExpiresAt < now;
  const needsRefresh =
    !offer.contract.signingUrl ||
    !offer.contract.signatureTokenHash ||
    tokenExpired ||
    offer.contract.signatureProvider !== "INTERNAL";

  if (needsRefresh) {
    const tokenPayload = issueFallbackSigningToken();
    signingUrl = buildFallbackSigningUrl(tokenPayload.token, offer.token);

    await prisma.contract.update({
      where: { id: offer.contract.id },
      data: {
        signatureProvider: "INTERNAL",
        docusignEnvelopeId: null,
        docusignStatus: "internal_pending",
        signingUrl,
        signatureTokenHash: tokenPayload.tokenHash,
        signatureTokenExpiresAt: getFallbackSigningExpiry(now),
        sentForSigningAt: offer.contract.sentForSigningAt ?? now,
      },
    });
  }

  if (!signingUrl) {
    return NextResponse.json({ error: "Keine Signatur-URL vorhanden." }, { status: 400 });
  }

  const result = await sendSigningEmail({
    customerName: offer.customerName,
    customerEmail: offer.customerEmail,
    signingLink: signingUrl,
    provider: "INTERNAL",
    contractPdfUrl: offer.contract.contractPdfUrl,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "E-Mail konnte nicht gesendet werden.", provider: "INTERNAL" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    provider: "INTERNAL",
    message: "Signatur-Link erneut gesendet.",
  });
}
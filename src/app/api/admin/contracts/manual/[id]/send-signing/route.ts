import { NextRequest, NextResponse } from "next/server";

import { requireAdminSession } from "@/server/auth/require-admin";
import { prisma } from "@/server/db/prisma";
import { sendSigningEmail } from "@/server/email/send-signing-email";
import { buildFallbackSigningUrl, getFallbackSigningExpiry, issueFallbackSigningToken } from "@/server/signing/fallback-signing";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession();
  if (!auth.ok) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { id } = await params;

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { offer: true },
  });

  if (!contract) return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });
  if (contract.status !== "PENDING_SIGNATURE") {
    return NextResponse.json({ error: "Vertrag ist nicht mehr offen" }, { status: 409 });
  }

  const now = new Date();
  let signingUrl = contract.signingUrl;
  const expired = !contract.signatureTokenExpiresAt || contract.signatureTokenExpiresAt < now;

  if (!signingUrl || !contract.signatureTokenHash || expired) {
    const tokenPayload = issueFallbackSigningToken();
    signingUrl = buildFallbackSigningUrl(tokenPayload.token, contract.offer.token);

    await prisma.contract.update({
      where: { id: contract.id },
      data: {
        signatureProvider: "INTERNAL",
        docusignStatus: "internal_pending",
        signingUrl,
        signatureTokenHash: tokenPayload.tokenHash,
        signatureTokenExpiresAt: getFallbackSigningExpiry(now),
        sentForSigningAt: contract.sentForSigningAt ?? now,
      },
    });
  }

  const emailResult = await sendSigningEmail({
    customerName: contract.offer.customerName,
    customerEmail: contract.offer.customerEmail,
    signingLink: signingUrl!,
    provider: "INTERNAL",
    contractPdfUrl: contract.contractPdfUrl,
  });

  if (!emailResult.success) {
    return NextResponse.json(
      { error: emailResult.error || "E-Mail konnte nicht gesendet werden", signingUrl },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, signingUrl });
}

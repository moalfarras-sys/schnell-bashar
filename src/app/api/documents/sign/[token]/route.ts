import { NextRequest, NextResponse } from "next/server";

import { SIGNING_CONSENT_TEXT } from "@/lib/documents/constants";
import { signDocumentSchema } from "@/lib/documents/schemas";
import { hashSigningToken } from "@/lib/documents/signature";
import { prisma } from "@/server/db/prisma";

function parseClientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip");
}

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const parsed = signDocumentSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabedaten" }, { status: 400 });
  }

  const tokenHash = hashSigningToken(token);
  const signingToken = await prisma.signingToken.findUnique({
    where: { tokenHash },
    include: {
      document: {
        include: {
          currentVersion: true,
        },
      },
      documentVersion: true,
    },
  });

  if (!signingToken) {
    return NextResponse.json({ error: "Ungültiger Signatur-Link" }, { status: 404 });
  }

  const now = new Date();
  const document = signingToken.document;
  const validDocumentStatus =
    document.status === "ADMIN_APPROVED" || document.status === "SIGNATURE_PENDING";

  if (
    signingToken.status !== "ACTIVE" ||
    signingToken.usedAt ||
    signingToken.expiresAt < now ||
    !validDocumentStatus ||
    !document.approvedAt ||
    !document.approvedByUserId ||
    !document.customerSignatureEnabled ||
    !document.currentVersion ||
    document.currentVersion.id !== signingToken.documentVersionId ||
    document.currentVersion.hash !== signingToken.documentHash
  ) {
    return NextResponse.json(
      {
        error:
          "Dieses Dokument ist noch nicht zur Unterschrift freigegeben. Bitte warten Sie auf die Prüfung durch Schnell Sicher Umzug.",
      },
      { status: 403 },
    );
  }

  const signature = await prisma.$transaction(async (tx) => {
    const created = await tx.documentSignature.create({
      data: {
        documentId: document.id,
        documentVersionId: signingToken.documentVersionId,
        signingTokenId: signingToken.id,
        signedAt: now,
        signerName: parsed.data.signerName,
        signerEmail: parsed.data.signerEmail ?? null,
        ipAddress: parseClientIp(req) ?? null,
        userAgent: req.headers.get("user-agent"),
        consentText: SIGNING_CONSENT_TEXT,
        documentHash: signingToken.documentHash,
      },
    });

    await tx.signingToken.update({
      where: { id: signingToken.id },
      data: {
        usedAt: now,
        signedAt: now,
        signerName: parsed.data.signerName,
        signerEmail: parsed.data.signerEmail ?? null,
        ipAddress: parseClientIp(req) ?? null,
        userAgent: req.headers.get("user-agent"),
        consentText: SIGNING_CONSENT_TEXT,
        status: "USED",
      },
    });

    await tx.document.update({
      where: { id: document.id },
      data: {
        status: "SIGNED",
      },
    });

    if (document.orderId) {
      await tx.order.update({
        where: { id: document.orderId },
        data: {
          workflowStatus: "SIGNED",
        },
      });
    }

    return created;
  });

  return NextResponse.json({
    success: true,
    signedAt: signature.signedAt,
  });
}

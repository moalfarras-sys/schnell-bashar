import { NextRequest, NextResponse } from "next/server";

import { approveDocumentForSignature } from "@/lib/documents/service";
import { buildSigningUrl } from "@/lib/documents/signature";
import { getAdminSessionClaims } from "@/server/auth/require-admin";
import { prisma } from "@/server/db/prisma";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const claims = await getAdminSessionClaims();
  if (!claims?.uid) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { id } = await context.params;
  const result = await approveDocumentForSignature({
    documentId: id,
    approvedByUserId: claims.uid,
  });

  if (result.document.orderId) {
    await prisma.order.update({
      where: { id: result.document.orderId },
      data: {
        workflowStatus: "CONTRACT_APPROVED_FOR_SIGNATURE",
      },
    });
  }

  return NextResponse.json({
    success: true,
    signingUrl: buildSigningUrl(result.token),
    expiresAt: result.expiresAt,
  });
}

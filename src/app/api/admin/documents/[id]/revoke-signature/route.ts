import { NextRequest, NextResponse } from "next/server";

import { revokeDocumentSignatureApproval } from "@/lib/documents/service";
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
  const document = await revokeDocumentSignatureApproval({
    documentId: id,
    actorUserId: claims.uid,
  });

  if (document.orderId) {
    await prisma.order.update({
      where: { id: document.orderId },
      data: {
        workflowStatus: "CONTRACT_DRAFTED",
      },
    });
  }

  return NextResponse.json({ success: true });
}

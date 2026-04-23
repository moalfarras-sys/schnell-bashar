import { NextRequest, NextResponse } from "next/server";

import { mapOrderToOfferDraft } from "@/lib/documents/mapping";
import { createDocumentDraft } from "@/lib/documents/service";
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
  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    return NextResponse.json({ error: "Anfrage nicht gefunden" }, { status: 404 });
  }

  const existing = await prisma.document.findFirst({
    where: {
      orderId: order.id,
      type: "ANGEBOT",
      status: {
        not: "SUPERSEDED",
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return NextResponse.json({ success: true, documentId: existing.id, reused: true });
  }

  const document = await createDocumentDraft(mapOrderToOfferDraft(order), claims.uid);

  await prisma.order.update({
    where: { id: order.id },
    data: {
      workflowStatus: "OFFER_DRAFTED",
    },
  });

  return NextResponse.json({ success: true, documentId: document.id }, { status: 201 });
}

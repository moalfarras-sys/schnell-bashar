import { NextRequest, NextResponse } from "next/server";

import { reviseDocumentDraft } from "@/lib/documents/service";
import { getAdminSessionClaims } from "@/server/auth/require-admin";
import { prisma } from "@/server/db/prisma";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const claims = await getAdminSessionClaims();
  if (!claims?.uid) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { id } = await context.params;
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      lineItems: true,
      currentVersion: true,
      signingTokens: {
        orderBy: { createdAt: "desc" },
      },
      signatures: {
        orderBy: { signedAt: "desc" },
      },
      order: {
        select: {
          publicId: true,
          orderNo: true,
          workflowStatus: true,
        },
      },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Dokument nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(document);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const claims = await getAdminSessionClaims();
  if (!claims?.uid) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const document = await reviseDocumentDraft({
    documentId: id,
    payload: body,
    actorUserId: claims.uid,
  });

  return NextResponse.json({ success: true, id: document.id });
}

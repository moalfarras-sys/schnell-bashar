import { NextRequest, NextResponse } from "next/server";

import { renderDocumentPdf } from "@/lib/documents/renderer";
import { uploadPrivateDocument } from "@/lib/documents/storage";
import { getAdminSessionClaims } from "@/server/auth/require-admin";
import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";

function toSnapshot(raw: unknown) {
  return raw as Parameters<typeof renderDocumentPdf>[0]["snapshot"];
}

export async function POST(
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
      currentVersion: true,
    },
  });

  if (!document || !document.currentVersion) {
    return NextResponse.json({ error: "Dokument nicht gefunden" }, { status: 404 });
  }

  const pdfBuffer = await renderDocumentPdf({
    type: document.type,
    number: document.number || document.id,
    snapshot: toSnapshot(document.currentVersion.dataSnapshot),
    includeAgbAppendix: document.includeAgbAppendix,
  });

  const key = `documents/${document.type.toLowerCase()}/${document.number || document.id}.pdf`;
  const uploadResult = await uploadPrivateDocument({
    key,
    buffer: pdfBuffer,
  });

  if (uploadResult) {
    await prisma.document.update({
      where: { id: document.id },
      data: {
        pdfStorageKey: key,
      },
    });

    await prisma.documentVersion.update({
      where: { id: document.currentVersion.id },
      data: {
        pdfStorageKey: key,
      },
    });
  }

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${document.number || document.id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

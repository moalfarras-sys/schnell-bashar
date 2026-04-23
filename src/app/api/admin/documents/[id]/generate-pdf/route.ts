import { NextRequest, NextResponse } from "next/server";

import { renderDocumentPdf } from "@/lib/documents/renderer";
import { documentVersionSnapshotSchema } from "@/lib/documents/schemas";
import { uploadPrivateDocument } from "@/lib/documents/storage";
import { getAdminSessionClaims } from "@/server/auth/require-admin";
import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";

function toSnapshot(raw: unknown) {
  const parsed = documentVersionSnapshotSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data as Parameters<typeof renderDocumentPdf>[0]["snapshot"];
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

  const snapshot = toSnapshot(document.currentVersion.dataSnapshot);
  if (!snapshot) {
    return NextResponse.json(
      { error: "Die aktuelle Dokumentversion enthält keine vollständigen PDF-Daten." },
      { status: 422 },
    );
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderDocumentPdf({
      type: document.type,
      number: document.number || document.id,
      snapshot,
      includeAgbAppendix: document.includeAgbAppendix,
    });
  } catch {
    return NextResponse.json(
      { error: "PDF konnte aus der aktuellen Dokumentversion nicht erzeugt werden." },
      { status: 422 },
    );
  }

  const key = `documents/${document.type.toLowerCase()}/${document.number || document.id}.pdf`;
  let uploadResult = null;
  try {
    uploadResult = await uploadPrivateDocument({
      key,
      buffer: pdfBuffer,
    });
  } catch {
    uploadResult = null;
  }

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

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${document.number || document.id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

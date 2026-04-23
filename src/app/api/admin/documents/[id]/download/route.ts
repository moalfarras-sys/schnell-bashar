import { NextRequest, NextResponse } from "next/server";

import { renderDocumentPdf } from "@/lib/documents/renderer";
import { documentVersionSnapshotSchema } from "@/lib/documents/schemas";
import { downloadPrivateDocument, privateDocumentBucket, privateSignedDocumentBucket } from "@/lib/documents/storage";
import { getAdminSessionClaims } from "@/server/auth/require-admin";
import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";

function toSnapshot(raw: unknown) {
  const parsed = documentVersionSnapshotSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data as Parameters<typeof renderDocumentPdf>[0]["snapshot"];
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const claims = await getAdminSessionClaims();
  if (!claims?.uid) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { id } = await context.params;
  const kind = req.nextUrl.searchParams.get("kind") === "signed" ? "signed" : "document";

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      currentVersion: true,
      signatures: {
        orderBy: { signedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Dokument nicht gefunden" }, { status: 404 });
  }

  const storageKey = kind === "signed" ? document.signatures[0]?.signedPdfStorageKey : document.pdfStorageKey;
  let buffer: Buffer | null = null;

  if (storageKey) {
    try {
      buffer = await downloadPrivateDocument({
        bucket: kind === "signed" ? privateSignedDocumentBucket() : privateDocumentBucket(),
        key: storageKey,
      });
    } catch {
      buffer = null;
    }
  }

  if (!buffer) {
    if (!document.currentVersion || kind === "signed") {
      return NextResponse.json({ error: "Keine PDF-Datei vorhanden." }, { status: 404 });
    }

    const snapshot = toSnapshot(document.currentVersion.dataSnapshot);
    if (!snapshot) {
      return NextResponse.json(
        { error: "Die aktuelle Dokumentversion enthält keine vollständigen PDF-Daten." },
        { status: 422 },
      );
    }

    try {
      buffer = await renderDocumentPdf({
        type: document.type,
        number: document.number || "Dokument",
        snapshot,
        includeAgbAppendix: document.includeAgbAppendix,
      });
    } catch {
      return NextResponse.json(
        { error: "PDF konnte aus der aktuellen Dokumentversion nicht erzeugt werden." },
        { status: 422 },
      );
    }
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${document.number || "Dokument"}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

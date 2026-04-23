import { NextRequest, NextResponse } from "next/server";

import { renderDocumentPdf } from "@/lib/documents/renderer";
import { downloadPrivateDocument, privateDocumentBucket, privateSignedDocumentBucket } from "@/lib/documents/storage";
import { getAdminSessionClaims } from "@/server/auth/require-admin";
import { prisma } from "@/server/db/prisma";

export const runtime = "nodejs";

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

  const key =
    kind === "signed"
      ? document.signatures[0]?.signedPdfStorageKey
      : document.pdfStorageKey;
  if (!key) {
    if (!document.currentVersion || kind === "signed") {
      return NextResponse.json({ error: "Keine PDF-Datei vorhanden" }, { status: 404 });
    }

    const buffer = await renderDocumentPdf({
      type: document.type,
      number: document.number || document.id,
      snapshot: document.currentVersion.dataSnapshot as Parameters<typeof renderDocumentPdf>[0]["snapshot"],
      includeAgbAppendix: document.includeAgbAppendix,
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${document.number || document.id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const buffer = await downloadPrivateDocument({
    bucket: kind === "signed" ? privateSignedDocumentBucket() : privateDocumentBucket(),
    key,
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${document.number || document.id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

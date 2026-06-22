import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

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
  try {
    const document = await reviseDocumentDraft({
      documentId: id,
      payload: body,
      actorUserId: claims.uid,
    });

    return NextResponse.json({ success: true, id: document.id });
  } catch (error) {
    if (error instanceof ZodError) {
      const first = error.issues[0];
      return NextResponse.json(
        {
          error:
            first?.path.join(".") === "customerData.email"
              ? "Bitte eine gültige E-Mail-Adresse eingeben oder das Feld leer lassen."
              : first?.message || "Bitte die Eingaben prüfen.",
        },
        { status: 400 },
      );
    }

    console.error("[admin/documents] update failed", error);
    return NextResponse.json(
      { error: "Dokument konnte nicht gespeichert werden. Bitte später erneut versuchen." },
      { status: 500 },
    );
  }
}

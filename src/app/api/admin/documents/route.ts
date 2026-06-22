import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { createDocumentDraft } from "@/lib/documents/service";
import { getAdminSessionClaims } from "@/server/auth/require-admin";
import { prisma } from "@/server/db/prisma";

export async function GET(req: NextRequest) {
  const claims = await getAdminSessionClaims();
  if (!claims?.uid) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type");
  const status = req.nextUrl.searchParams.get("status");

  const documents = await prisma.document.findMany({
    where: {
      ...(type ? { type: type as never } : {}),
      ...(status ? { status: status as never } : {}),
    },
    include: {
      currentVersion: true,
      order: {
        select: {
          publicId: true,
          orderNo: true,
          workflowStatus: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function POST(req: NextRequest) {
  const claims = await getAdminSessionClaims();
  if (!claims?.uid) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  try {
    const document = await createDocumentDraft(body, claims.uid);
    return NextResponse.json({ success: true, id: document.id }, { status: 201 });
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

    console.error("[admin/documents] create failed", error);
    return NextResponse.json(
      { error: "Dokument konnte nicht gespeichert werden. Bitte später erneut versuchen." },
      { status: 500 },
    );
  }
}

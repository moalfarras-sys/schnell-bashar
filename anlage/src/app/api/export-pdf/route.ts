import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth-guard";
import { exportDocumentPdf, getPdfFileName } from "@/lib/pdf";
import { getCompanyById, getJob } from "@/lib/storage";
import { isActiveCompanyJob } from "@/lib/tenant";
import type { DocumentType } from "@/types/document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBaseUrl(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: Request) {
  const authError = await requireAdminApi();
  if (authError) {
    return authError;
  }

  const body = (await request.json()) as {
    jobId?: string;
    documentType?: DocumentType;
    download?: boolean;
  };

  if (
    !body.jobId ||
    !body.documentType ||
    !["angebot", "vertrag", "rechnung"].includes(body.documentType)
  ) {
    return NextResponse.json(
      { error: "jobId und documentType sind erforderlich." },
      { status: 400 }
    );
  }

  const job = await getJob(body.jobId);

  if (!job || !isActiveCompanyJob(job)) {
    return NextResponse.json(
      { error: "Auftrag nicht gefunden." },
      { status: 404 }
    );
  }

  const company = await getCompanyById(job.companyId);

  if (!company) {
    return NextResponse.json(
      { error: "Firma nicht gefunden." },
      { status: 404 }
    );
  }

  try {
    const { filePath, pdfBuffer } = await exportDocumentPdf({
      baseUrl: getBaseUrl(request),
      company,
      documentType: body.documentType,
      job,
      sessionCookie: request.headers.get("cookie") ?? undefined
    });

    if (body.download) {
      const pdfBody = pdfBuffer.buffer.slice(
        pdfBuffer.byteOffset,
        pdfBuffer.byteOffset + pdfBuffer.byteLength
      ) as ArrayBuffer;

      return new Response(pdfBody, {
        headers: {
          "Content-Disposition": `attachment; filename="${getPdfFileName(job, body.documentType)}"`,
          "Content-Type": "application/pdf"
        }
      });
    }

    return NextResponse.json({ ok: true, filePath });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "PDF konnte nicht erstellt werden."
      },
      { status: 500 }
    );
  }
}

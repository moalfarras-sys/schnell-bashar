import { NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";
import { buildInlinePdfResponse, loadContractPdfBuffer } from "@/server/contracts/resolve-contract-pdf";
import { contractDisplayNo } from "@/server/ids/document-number";

type PdfKind = "auto" | "signed" | "contract";

function normalizeKind(raw: string | null): PdfKind {
  if (raw === "signed") return "signed";
  if (raw === "contract") return "contract";
  return "auto";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const tokenValue = String(token || "").trim();
  if (!tokenValue) {
    return NextResponse.json({ error: "Token fehlt" }, { status: 400 });
  }

  const kind = normalizeKind(new URL(req.url).searchParams.get("kind"));
  const contract = await prisma.contract.findFirst({
    where: {
      offer: {
        token: tokenValue,
      },
    },
    include: {
      offer: {
        select: {
          order: {
            select: {
              orderNo: true,
              publicId: true,
            },
          },
        },
      },
    },
  });

  if (!contract) {
    return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });
  }

  const displayContractNo = contractDisplayNo({
    contractNo: contract.contractNo,
    id: contract.id,
    orderNo: contract.offer.order?.orderNo ?? null,
    orderPublicId: contract.offer.order?.publicId ?? null,
  });

  const preferredSources =
    kind === "signed"
      ? [contract.signedPdfUrl, contract.contractPdfUrl]
      : kind === "contract"
        ? [contract.contractPdfUrl, contract.signedPdfUrl]
        : [contract.signedPdfUrl, contract.contractPdfUrl];

  for (const source of preferredSources) {
    const pdf = await loadContractPdfBuffer(source);
    if (pdf) {
      return buildInlinePdfResponse(pdf, `Vertrag-${displayContractNo}.pdf`);
    }
  }

  return NextResponse.json(
    { error: "PDF konnte nicht geladen werden" },
    { status: 404 },
  );
}

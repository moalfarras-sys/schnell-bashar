import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { prisma } from "@/server/db/prisma";
import { buildInlinePdfResponse, loadContractPdfBuffer } from "@/server/contracts/resolve-contract-pdf";
import { contractDisplayNo } from "@/server/ids/document-number";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  try {
    await verifyAdminToken(token);
  } catch {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { contractId } = await params;
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
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

  const signedPdf =
    (await loadContractPdfBuffer(contract.signedPdfUrl)) ||
    (await loadContractPdfBuffer(contract.contractPdfUrl));

  if (!signedPdf) {
    return NextResponse.json({ error: "Signiertes PDF nicht gefunden" }, { status: 404 });
  }

  return buildInlinePdfResponse(signedPdf, `Signierter-Vertrag-${displayContractNo}.pdf`);
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { prisma } from "@/server/db/prisma";
import { generateContractPDF } from "@/server/pdf/generate-contract";
import {
  contractDisplayNo,
  offerDisplayNo,
  orderDisplayNo,
} from "@/server/ids/document-number";

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
        include: {
          order: true,
        },
      },
    },
  });

  if (!contract) {
    return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });
  }

  const services = Array.isArray(contract.offer.services) ? contract.offer.services : [];
  const orderNo = contract.offer.order ? orderDisplayNo(contract.offer.order) : contract.offer.id;
  const displayOfferNo = offerDisplayNo({
    offerNo: contract.offer.offerNo,
    id: contract.offer.id,
    orderNo: contract.offer.order?.orderNo ?? null,
    orderPublicId: contract.offer.order?.publicId ?? null,
  });
  const displayContractNo = contractDisplayNo({
    contractNo: contract.contractNo,
    id: contract.id,
    orderNo: contract.offer.order?.orderNo ?? null,
    orderPublicId: contract.offer.order?.publicId ?? null,
  });

  const pdfBuffer = await generateContractPDF({
    contractId: contract.id,
    contractNo: displayContractNo,
    offerNo: displayOfferNo,
    orderNo,
    contractDate: contract.createdAt,
    signedAt: contract.signedAt ?? undefined,
    customerName: contract.offer.customerName,
    customerAddress: contract.offer.customerAddress || undefined,
    customerPhone: contract.offer.customerPhone || "",
    customerEmail: contract.offer.customerEmail || "",
    moveFrom: contract.offer.moveFrom || undefined,
    moveTo: contract.offer.moveTo || undefined,
    moveDate: contract.offer.moveDate || undefined,
    floorFrom: contract.offer.floorFrom || undefined,
    floorTo: contract.offer.floorTo || undefined,
    elevatorFrom: contract.offer.elevatorFrom,
    elevatorTo: contract.offer.elevatorTo,
    notes: contract.offer.notes || undefined,
    services: services as Array<{ name: string; description?: string; quantity?: number; unit?: string }>,
    netCents: contract.offer.netCents,
    vatCents: contract.offer.vatCents,
    grossCents: contract.offer.grossCents,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Vertrag-${displayContractNo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

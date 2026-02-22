import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { adminCookieName, verifyAdminToken } from "@/server/auth/admin-session";
import { prisma } from "@/server/db/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ offerId: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName())?.value;
  if (!token) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  try {
    await verifyAdminToken(token);
  } catch {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const { offerId } = await params;

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { contract: true },
  });
  if (!offer) return NextResponse.json({ error: "Angebot nicht gefunden" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.offer.update({
      where: { id: offerId },
      data: { status: "CANCELLED" },
    });

    if (offer.contract && offer.contract.status === "PENDING_SIGNATURE") {
      await tx.contract.update({
        where: { id: offer.contract.id },
        data: {
          status: "CANCELLED",
          docusignStatus: offer.contract.signatureProvider === "INTERNAL" ? "internal_cancelled" : "cancelled",
        },
      });
    }
  });

  return NextResponse.json({ success: true });
}
